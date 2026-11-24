// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use serde::{Deserialize, Serialize};
use std::{fs, time::UNIX_EPOCH};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ScanOptions {
    path: String,
    name: Option<String>,
    extensions: Option<Vec<String>>,
    modified_after: Option<u64>,
    modified_before: Option<u64>,
    min_size: Option<u64>,
    max_size: Option<u64>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct FileEntry {
    name: String,
    path: String,
    size: Option<u64>,
    modified_at: Option<u64>,
}

fn scan_directory_sync(options: ScanOptions) -> Result<Vec<FileEntry>, String> {
    let entries =
        fs::read_dir(&options.path).map_err(|e| format!("Cannot read directory: {}", e))?;

    let name_filter = options
        .name
        .as_deref()
        .map(str::trim)
        .filter(|name| !name.is_empty())
        .map(str::to_lowercase);

    let extensions: Vec<String> = options
        .extensions
        .unwrap_or_default()
        .into_iter()
        .map(|ext| ext.trim().trim_start_matches('.').to_lowercase())
        .filter(|ext| !ext.is_empty())
        .collect();

    let mut results = Vec::new();

    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;

        // Only direct files, no directories or subdirectories.
        let file_type = entry.file_type().map_err(|e| e.to_string())?;

        if !file_type.is_file() {
            continue;
        }

        let name = entry.file_name().to_string_lossy().to_string();

        if name_filter
            .as_ref()
            .is_some_and(|filter| !name.to_lowercase().contains(filter))
        {
            continue;
        }

        // Extension filtering.
        if !extensions.is_empty() {
            let extension = entry
                .path()
                .extension()
                .and_then(|ext| ext.to_str())
                .unwrap_or("")
                .to_lowercase();

            if !extensions.contains(&extension) {
                continue;
            }
        }

        let metadata = entry.metadata().map_err(|e| e.to_string())?;

        let file_size = metadata.len();

        let modified = metadata
            .modified()
            .ok()
            .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
            .map(|duration| duration.as_millis() as u64);

        // Size filtering.
        if options.min_size.is_some_and(|min| file_size < min) {
            continue;
        }

        if options.max_size.is_some_and(|max| file_size > max) {
            continue;
        }

        // Date filtering.
        if options
            .modified_after
            .is_some_and(|after| modified.is_none_or(|time| time < after))
        {
            continue;
        }

        if options
            .modified_before
            .is_some_and(|before| modified.is_none_or(|time| time > before))
        {
            continue;
        }

        results.push(FileEntry {
            name,
            path: entry.path().to_string_lossy().to_string(),
            size: Some(file_size),
            modified_at: modified,
        });
    }

    Ok(results)
}

#[tauri::command]
async fn scan_directory(options: ScanOptions) -> Result<Vec<FileEntry>, String> {
    tauri::async_runtime::spawn_blocking(move || scan_directory_sync(options))
        .await
        .map_err(|e| e.to_string())?
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![scan_directory])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
