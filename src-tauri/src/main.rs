#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod csv_helpers;
mod commands;
mod db;
mod app_state;
mod ui_notify;
use commands::*;
use csv_helpers::CsvWatcherState;
use db::DbService;
use std::sync::{Arc, Mutex};

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            app_state::init_app_handle(app.handle().clone());
            Ok(())
        })
        .manage(Arc::new(
            DbService::new().expect("Failed to init DuckDB"),
        ))
        .manage(CsvWatcherState {
            watcher: Mutex::new(None),
        })
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            load_csv_folder,
            get_csv_schemas,
            execute_sql
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
