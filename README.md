# Quickstart

1. Install docker
2. Obtain the propert env variables and create a .env file containing them
3. run `docker build .`
4. run `docker-compose up dev` to develop
5. run `docker-compose up build` to build (outputs to `dist` folder)

## Data
The explorer queries static parquet files in the browser with [DuckDB-WASM](https://duckdb.org/docs/api/wasm/overview); there is no query server. The files live on Cloudflare R2 at `https://pesticide.cdn.uchicago-dsi.org/v1` (set in `src/utils/queries.ts`; `VITE_DATA_URL` overrides it) and are built by `cli/build_r2.py` in the `cpr` repo. The host must allow CORS and range requests.

- **Query parity:** `pnpm parity` runs every query in `scripts/fixtures.json` (snapshots of the old nectr API) through `src/utils/queries.ts` and compares the results. `VITE_DATA_URL` can also be a local path to a `data/r2` build. CI runs it on pull requests.
- **DuckDB runtime:** the wasm, workers and parquet extension load from the same bucket (`duckdb-wasm/<package version>/`), not from jsDelivr or extensions.duckdb.org. After upgrading `@duckdb/duckdb-wasm`, upload the new runtime with an R2 API token that can write to the bucket (the same kind the `cpr` pipeline uses):
  ```bash
  R2_ACCOUNT_ID=… R2_BUCKET=… AWS_ACCESS_KEY_ID=… AWS_SECRET_ACCESS_KEY=… pnpm exec tsx scripts/duckdb-runtime.ts upload
  ```
  CI fails until the files for the pinned version are there.
- **Validation against CalPIP:** open the site with `?page=validation` (locally, http://localhost:5173/?page=validation). It runs the explorer's queries live against the current data and compares them with the CalPIP exports in `public/groundtruth/csv_records`.

## env requirements
```
VITE_DATA_URL = ... // optional; defaults to https://pesticide.cdn.uchicago-dsi.org/v1 (src/utils/queries.ts)
VITE_MAPBOX_TOKEN = ... // mapbox API key

```

## Output
In `dist` after running the build, you'll find a folder, `assets`, containing the relevant code chunks and graphics. Deploy this on your website and add the minimal HTML from `index.html` to your desired page. 

## Github Actions to Build the application
Alternatively to Docker, you can use github actions to build the application:
1. From the repository, go to "Actions" on the repo menu
2. Go to "Build Vite Application" on the left hand pane
3. Click "Run Workflow" > "Run Workflow"
4. After the build completes, looks for the section titled "Artifacts" at the bottom of the action run information. Download the artifact "dist" which contains the build output

# Boilerplate: React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type aware lint rules:

- Configure the top-level `parserOptions` property like this:

```js
export default {
  // other rules...
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: ['./tsconfig.json', './tsconfig.node.json'],
    tsconfigRootDir: __dirname,
  },
}
```

- Replace `plugin:@typescript-eslint/recommended` to `plugin:@typescript-eslint/recommended-type-checked` or `plugin:@typescript-eslint/strict-type-checked`
- Optionally add `plugin:@typescript-eslint/stylistic-type-checked`
- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and add `plugin:react/recommended` & `plugin:react/jsx-runtime` to the `extends` list
