use duckdb::Connection;
use std::sync::{Arc, Mutex};

#[derive(Clone)]
pub struct DbService {
    pub conn: Arc<Mutex<Connection>>,
}

impl DbService {
    pub fn new() -> Result<Self, duckdb::Error> {
        let conn = Connection::open_in_memory()?;
        Ok(Self {
            conn: Arc::new(Mutex::new(conn)),
        })
    }
}
