use serde::Serialize;
use tauri::Emitter;

use crate::app_state::get_app_handle;

pub fn notify_ui<T: Serialize + std::clone::Clone>(event: &str, payload: T) {
    let app = get_app_handle();

    if let Err(e) = app.emit(event, payload) {
        eprintln!("UI notify failed: {:?}", e);
    }
}
