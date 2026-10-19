use crate::Database;
use std::collections::HashMap;

#[derive(Debug)]
pub struct Transaction {
    db: Database,
    pending: HashMap<String, Option<String>>,
    reads: HashMap<String, Option<u64>>,
}

// SELECT * FROM table where id = 1;
//

impl Database {
    pub fn begin(&self) -> Transaction {
        Transaction {
            db: self.clone(), //clones reference
            pending: HashMap::new(),
            reads: HashMap::new(),
        }
    }
}

#[derive(Debug)]
pub enum CommitErr {
    Conflict,
}

impl Transaction {
    pub fn set(&mut self, key: String, value: String) {
        self.pending.insert(key, Some(value));
    }

    pub fn get(&mut self, key: &str) -> Option<String> {
        match self.pending.get(key) {
            Some(Some(v)) => Some(v.clone()),
            Some(None) => None,
            None => {
                let found = self.db.get_versioned(key);

                let seen: Option<u64> = found.as_ref().map(|(ver, _)| *ver);

                self.reads.entry(key.to_string()).or_insert(seen);

                found.map(|(_, val)| val)
            }
        }
    }

    pub fn delete(&mut self, key: String) {
        self.pending.insert(key, None);
    }

    pub fn commit(self) -> Result<(), CommitErr> {
        for (key, seen_version) in &self.reads {
            let current_version = self.db.get_versioned(key).map(|(ver, _)| ver);
            if *seen_version != current_version {
                return Err(CommitErr::Conflict);
            }
        }

        for (key, value) in self.pending {
            match value {
                Some(v) => self.db.insert(key, v),
                None => self.db.delete(&key),
            }
        }

        Ok(())
    }
}
