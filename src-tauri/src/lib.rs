// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
// mod commands;
// mod db;

// use commands::*;
// use db::DbService;

// #[tauri::command]
// fn greet(name: &str) -> String {
//     format!("Hello, {}! You've been greeted from Rust!", name)
// }

// #[cfg_attr(mobile, tauri::mobile_entry_point)]
// pub fn run() {
//     tauri::Builder::default()
//         .plugin(tauri_plugin_opener::init())
//         .plugin(tauri_plugin_dialog::init())
//         .invoke_handler(tauri::generate_handler![
//             greet,
//             load_csv_folder,
//             get_csv_schemas,
//             execute_sql
//         ])
//         .run(tauri::generate_context!())
//         .expect("error while running tauri application");
// }
