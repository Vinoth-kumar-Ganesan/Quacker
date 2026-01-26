use crate::csv_helpers;
use crate::csv_helpers::CsvWatcherState;
use crate::db::DbService;
use serde_json::Value;
use std::sync::Arc;
use tauri::State;

#[tauri::command]
pub fn load_csv_folder(
    folder_path: String,
    db: State<'_, Arc<DbService>>,
    watcher_state: State<'_, CsvWatcherState>,
) -> Result<Vec<String>, String> {
    csv_helpers::load_csv_folder(
        &folder_path,
        Arc::clone(&db),
        &watcher_state,
    )
}

#[tauri::command]
pub fn get_csv_schemas(
    db: State<'_, Arc<DbService>>,
) -> Result<Vec<csv_helpers::TableSchema>, String> {
    csv_helpers::get_csv_schemas(Arc::clone(&db))
}

#[tauri::command]
pub fn execute_sql(
    sql: String,
    db: State<'_, Arc<DbService>>,
) -> Result<Vec<Value>, String> {
    csv_helpers::execute_sql(&sql, Arc::clone(&db))
}
