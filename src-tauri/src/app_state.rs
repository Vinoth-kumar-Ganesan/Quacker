use std::sync::OnceLock;
use tauri::AppHandle;

static APP_HANDLE: OnceLock<AppHandle> = OnceLock::new();

pub fn init_app_handle(app_handle: AppHandle) {
    if APP_HANDLE.set(app_handle).is_err() {
        // Optional: log or panic if already set
        eprintln!("Warning: AppHandle was already initialized");
    }
}

pub fn get_app_handle() -> &'static AppHandle {
    APP_HANDLE
        .get()
        .expect("AppHandle not initialized. Did you call init_app_handle()?")
}