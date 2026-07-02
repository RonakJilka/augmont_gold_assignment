# Postman

Import `assignment.postman_collection.json`.

Flow:

1. `Auth → Register` (or Login if user exists) — Login sets `{{token}}` automatically.
2. `Categories → Create` — sets `{{categoryUniqueId}}`.
3. `Products → Create` — form-data with `image` file, sets `{{productUniqueId}}`.
4. `Bulk Upload → Upload` — attach `sample-products.csv` (replace `CAT-XXXXXX` with a real one first) — sets `{{jobId}}`.
5. `Bulk Upload → Job Status` — poll until `status: completed`.
6. `Reports → Create Products Report` — sets `{{jobId}}`. Poll `Reports → Job Status`, then `Reports → Download`.

Note: `sample-products.csv` uses `CAT-XXXXXX` as a placeholder. Edit the file to reference a real category
`uniqueId` (from Categories → Create response) before uploading.
