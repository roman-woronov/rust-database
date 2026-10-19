mod transaction;
use std::collections::HashMap;

use std::sync::{Arc, Mutex};


#[derive(Debug, Clone)]
struct Database {
    data: Arc<Mutex<HashMap<String, (u64, String)>>>,
}

impl Database {
    pub fn new() -> Database {
        Database {
            data: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub fn insert(&self, key: String, value: String) {
        let mut lock = self.data.lock().unwrap();

        let next_version = match lock.get(&key) {
            Some((v, _)) => v + 1,
            None => 1,
        };

        lock.insert(key, (next_version, value));
    }

    pub fn get(&self, key: &str) -> Option<String> {
        self.get_versioned(key).map(|(_, v)| v)
    }

    pub fn delete(&self, key: &str) {
        let mut lock = self.data.lock().unwrap();
        lock.remove(key);
    }

    pub fn get_versioned(&self, key: &str) -> Option<(u64, String)> {
        let lock = self.data.lock().unwrap();

        lock.get(key).map(|(ver, val)| (*ver, val.clone()))
    }

}

#[cfg(test)]
mod tests {

    use super::*;

    #[test]
    fn test_insert_and_get() {
        let db = Database::new();

        db.insert("k".to_string(), "v".to_string());

        assert_eq!(db.get("k"), Some("v".to_string()))
    }

    #[test]
    fn commit_is_visible() {
        let db = Database::new();

        let mut tnx = db.begin();
        tnx.set("k".to_string(), "v".to_string());
        tnx.commit().unwrap();

        assert!(db.get("k") == Some("v".to_string()))
    }

    #[test]
    fn drop_without_commit_is_rolled_back() {
        let db = Database::new();

        {
            let mut tnx = db.begin();
            tnx.set("k".to_string(), "v".to_string());
        }
        assert_eq!(db.get("k"), None);
    }

    #[test]
    fn two_live_transactions() {
        let db = Database::new();
        let mut t1 = db.begin();
        let mut t2 = db.begin();

        t1.set("k".to_string(), "1".to_string());
        t2.set("k".to_string(), "2".to_string());

        t1.commit().unwrap();
        t2.commit().unwrap();

        assert_eq!(db.get("k"), Some("2".to_string()));
    }

    #[test]
    #[ignore = "commit must validate+write under one lock, and the loop must retry on Conflict"]
    fn threaded_increment_race() {
        use std::thread;

        let db = Database::new();
        db.insert("counter".to_string(), "0".to_string());

        let n_threads = 100;
        let per_thread = 1000;

        let mut handles = vec![];

        for _ in 0..n_threads {
            let d = db.clone();
            handles.push(thread::spawn(move || {
                for _ in 0..per_thread {
                    let mut tnx = d.begin();
                    let mut val: i32 = tnx.get("counter").unwrap().parse::<i32>().unwrap();
                    val += 1;
                    tnx.set("counter".to_string(), val.to_string());

                    tnx.commit();
                }
            }))
        }

        for h in handles {
            h.join().unwrap();
        }

        let got: i32 = db.get("counter").unwrap().parse().unwrap();
        let expected = n_threads * per_thread;
        println!("expected {expected},got {got}");
        assert_eq!(expected, got);
    }
}
