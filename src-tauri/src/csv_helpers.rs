use crate::db::DbService;
use glob::glob;
use notify::{EventKind, RecursiveMode, RecommendedWatcher, Watcher};
use serde::Serialize;
use serde_json::{json, Value};
use std::path::Path;
use std::sync::{Arc, Mutex};
use crate::ui_notify::notify_ui;

/* =======================
   WATCHER STATE
======================= */

pub struct CsvWatcherState {
    pub watcher: Mutex<Option<RecommendedWatcher>>,
}

/* =======================
   CSV HELPERS
======================= */

pub fn normalize_table_name(path: &Path) -> String {
    path.file_stem()
        .unwrap()
        .to_string_lossy()
        .replace('-', "_")
        .replace(' ', "_")
}

pub fn create_or_replace_table(
    conn: &duckdb::Connection,
    path: &Path,
) -> Result<(), String> {
    let table_name = normalize_table_name(path);
    let sql = format!(
        "CREATE OR REPLACE TABLE {} AS SELECT * FROM read_csv_auto('{}')",
        table_name,
        path.display()
    );

    conn.execute(&sql, [])
        .map(|_| ())
        .map_err(|e| e.to_string())
}

pub fn drop_table(
    conn: &duckdb::Connection,
    path: &Path,
) -> Result<(), String> {
    let table_name = normalize_table_name(path);
    let sql = format!("DROP TABLE IF EXISTS {}", table_name);

    conn.execute(&sql, [])
        .map(|_| ())
        .map_err(|e| e.to_string())
}

/* =======================
   CSV LISTENER
======================= */

pub fn start_csv_listener_internal(
    folder_path: &str,
    db: Arc<DbService>,
    watcher_state: &CsvWatcherState,
) -> Result<(), String> {
    let db = Arc::clone(&db);

    let mut watcher = notify::recommended_watcher(
        move |res: Result<notify::Event, notify::Error>| {
            let event = match res {
                Ok(e) => e,
                Err(_) => return,
            };

            let conn = match db.conn.lock() {
                Ok(c) => c,
                Err(_) => return,
            };

            for path in event.paths {
                if path.extension().and_then(|e| e.to_str()) != Some("csv") {
                    continue;
                }

                match event.kind {
                    EventKind::Create(_) | EventKind::Modify(_) => {
                        let _ = create_or_replace_table(&conn, &path);
                        notify_ui("backend-notify",json!({
                                "status": "success",
                                "message": "csv-sync"
                            }),
                        );
                    }
                    EventKind::Remove(_) => {
                        let _ = drop_table(&conn, &path);
                        notify_ui("backend-notify", json!({
                                "status": "success",
                                "message": "csv-sync"
                            }),
                        );
                    }
                    _ => {}
                }
            }
        },
    )
        .map_err(|e| e.to_string())?;

    watcher
        .watch(Path::new(folder_path), RecursiveMode::Recursive)
        .map_err(|e| e.to_string())?;

    *watcher_state.watcher.lock().unwrap() = Some(watcher);

    Ok(())
}

/* =======================
   LOAD CSV FOLDER
======================= */

pub fn load_csv_folder(
    folder_path: &str,
    db: Arc<DbService>,
    watcher_state: &CsvWatcherState,
) -> Result<Vec<String>, String> {
    let mut tables = Vec::new();
    let pattern = format!("{}/**/*.csv", folder_path);

    {
        let conn = db.conn.lock().map_err(|_| "DB lock poisoned")?;
        for entry in glob(&pattern).map_err(|e| e.to_string())? {
            let path = entry.map_err(|e| e.to_string())?;
            let table_name = normalize_table_name(&path);
            create_or_replace_table(&conn, &path)?;
            tables.push(table_name);
        }
    }

    start_csv_listener_internal(folder_path, db, watcher_state)?;

    Ok(tables)
}

/* =======================
   SCHEMA MODELS
======================= */

#[derive(Serialize)]
pub struct ColumnSchema {
    pub name: String,
    pub data_type: String,
}

#[derive(Serialize)]
pub struct TableSchema {
    pub table: String,
    pub columns: Vec<ColumnSchema>,
}

/* =======================
   GET CSV SCHEMAS
======================= */

pub fn get_csv_schemas(
    db: Arc<DbService>,
) -> Result<Vec<TableSchema>, String> {
    let conn = db.conn.lock().map_err(|_| "DB lock poisoned")?;

    let mut stmt = conn.prepare("SHOW TABLES").map_err(|e| e.to_string())?;
    let table_iter = stmt
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(|e| e.to_string())?;

    let mut schemas = Vec::new();

    for table in table_iter {
        let table_name = table.map_err(|e| e.to_string())?;
        let pragma = format!("PRAGMA table_info('{}')", table_name);

        let mut col_stmt = conn.prepare(&pragma).map_err(|e| e.to_string())?;
        let columns = col_stmt
            .query_map([], |row| {
                Ok(ColumnSchema {
                    name: row.get(1)?,
                    data_type: row.get(2)?,
                })
            })
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;

        schemas.push(TableSchema {
            table: table_name,
            columns,
        });
    }

    Ok(schemas)
}

/* =======================
   EXECUTE SQL (FIXED)
======================= */

pub fn execute_sql(
    sql: &str,
    db: Arc<DbService>,
) -> Result<Vec<Value>, String> {
    if sql.trim().is_empty() {
        return Err("SQL cannot be empty".into());
    }

    let conn = db.conn.lock().map_err(|_| "DB lock poisoned")?;

    let mut stmt = conn
        .prepare(&sql)
        .map_err(|e| e.to_string())?;

    // Execute the query
    let mut rows = stmt
        .query([])
        .map_err(|e| e.to_string())?;

    // Get column info directly from Rows (no borrow of stmt needed anymore)
    let row_ref = rows
        .as_ref()
        .ok_or("No rows reference available")?;  // rare failure case

    let column_count = row_ref.column_count();

    let column_names: Vec<String> = (0..column_count)
        .map(|i| {
            let name_ref: &String = row_ref.column_name(i)?;  // ? propagates the duckdb::Error
            Ok(name_ref.clone())                              // or name_ref.to_string()
        })
        .collect::<Result<_, duckdb::Error>>()
        .map_err(|e| e.to_string())?;

    let mut results = Vec::new();

    // Now we can safely iterate
    while let Some(row) = rows.next().map_err(|e| e.to_string())? {
        let mut obj = serde_json::Map::new();

        for (i, col_name) in column_names.iter().enumerate() {
            let val_ref = row.get_ref(i).map_err(|e| e.to_string())?;

            let json_val = match val_ref {
                duckdb::types::ValueRef::Null => serde_json::Value::Null,
                duckdb::types::ValueRef::Boolean(b) => serde_json::Value::Bool(b),
                duckdb::types::ValueRef::TinyInt(i) => serde_json::Value::from(i),
                duckdb::types::ValueRef::SmallInt(i) => serde_json::Value::from(i),
                duckdb::types::ValueRef::Int(i) => serde_json::Value::from(i),
                duckdb::types::ValueRef::BigInt(i) => serde_json::Value::from(i),
                duckdb::types::ValueRef::Float(f) => serde_json::Value::from(f),
                duckdb::types::ValueRef::Double(f) => serde_json::Value::from(f),
                duckdb::types::ValueRef::Text(t) => {
                    serde_json::Value::String(String::from_utf8_lossy(t).into_owned())
                }
                duckdb::types::ValueRef::Blob(b) => {
                    serde_json::Value::Array(b.iter().map(|&byte| serde_json::Value::from(byte)).collect())
                }
                _ => row.get::<_, Option<String>>(i)
                    .ok()
                    .flatten()
                    .map(serde_json::Value::String)
                    .unwrap_or(serde_json::Value::Null),
            };

            obj.insert(col_name.clone(), json_val);
        }

        results.push(serde_json::Value::Object(obj));
    }

    Ok(results)
}

