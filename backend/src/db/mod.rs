pub mod models;

use sqlx::PgPool;

pub async fn run_migrations(pool: &PgPool) -> Result<(), sqlx::Error> {
    let migrations_dir = std::env::var("MIGRATIONS_DIR")
        .unwrap_or_else(|_| {
            std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
                .join("migrations")
                .to_string_lossy()
                .to_string()
        });
    let migrations_dir = std::path::PathBuf::from(migrations_dir);
    let mut entries: Vec<_> = std::fs::read_dir(&migrations_dir)
        .map_err(sqlx::Error::Io)?
        .filter_map(|e| e.ok())
        .filter(|e| {
            e.path()
                .extension()
                .map_or(false, |ext| ext == "sql")
        })
        .collect();
    entries.sort_by_key(|e| e.file_name());

    for entry in entries {
        let sql = std::fs::read_to_string(entry.path()).map_err(sqlx::Error::Io)?;
        sqlx::raw_sql(&sql).execute(pool).await?;
        tracing::info!("Applied migration {}", entry.file_name().to_string_lossy());
    }

    tracing::info!("Database migrations completed");
    Ok(())
}
