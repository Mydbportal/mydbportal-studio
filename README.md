# Mydbportal studio

Mydbportal studio is a modern, web based database management tool designed for developers. It provides a clean and intuitive interface to connect to, explore, and manage multiple databases, including PostgreSQL, MySQL, and MongoDB and more in future.

## Features

- **Multi Database Support:** Connect to and manage PostgreSQL, MySQL, and MongoDB databases.
- **Connection Management:** Easily save and manage multiple database connections.
- **Shareable Connections:** Share database connections securely via a unique token.
- **Data Viewer:** Browse and explore your database tables and collections with a clean, intuitive table view.
- **JSON Viewer:** View and explore JSON data within your database.
- **Query Editor:** Write and execute custom queries with syntax highlighting.
- **Light & Dark Mode:** Switch between light and dark themes for your comfort.


## Supported Databases

- PostgreSQL
- MySQL
- MongoDB
- More databases coming soon!

## Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

- Node.js and npm (or yarn/pnpm/bun) installed.
- By default, a master key is auto-generated and stored at `./data/vault.key`.
- Optional: set `DB_STUDIO_MASTER_KEY` to provide your own master key.
- Optional: set `DB_STUDIO_MASTER_KEY_FILE` to override the key file path.
- Optional: set `DB_STUDIO_VAULT_PATH` to override the default vault location (`./data/vault.sqlite`).

### Installation

1.  Clone the repo
    ```sh
    git clone https://github.com/your_username/master-database-studio.git
    ```
2.  Install NPM packages
    ```sh
    bun install
    ```
3.  Start the development server
    ```sh
    bun run dev
    ```
4.  Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

## Desktop (Electron)

The project includes an Electron scaffold that always runs the app on
`http://127.0.0.1:9221`, so Dexie/IndexedDB persists across runs.

1. Install dependencies:
   ```sh
   bun install
   ```
2. Run desktop app in development mode:
   ```sh
   bun run desktop:dev
   ```
3. Build desktop installers:
   ```sh
   bun run desktop:dist
   ```
4. (Optional) run desktop app against production Next server locally:
   ```sh
   bun run desktop:run
   ```

### Desktop Build Targets

- Linux: `AppImage`, `deb`, `rpm`
- macOS: `dmg`, `zip`
- Windows: `nsis`, `portable`

## Technologies Used

- **Framework:** [Next.js](https://nextjs.org/)
- **UI:** [React](https://reactjs.org/), [Tailwind CSS](https://tailwindcss.com/), [shadcn/ui](https://ui.shadcn.com/)
- **Database Drivers:** `pg`, `mysql2`, `mongodb`


## Project Structure

```
/
├── app/                # Next.js App Router pages and layouts
│   ├── actions/        # Server-side actions for database operations
│   ├── studio/         # Main application UI
│   └── ...
├── components/         # Shared UI components
│   └── ui/             # Reusable UI components (shadcn/ui)
├── hooks/              # Custom React hooks
├── lib/                # Utility functions and libraries
│   ├── adapters/       # Database-specific adapters
│   └── Helpers/        # Helper functions
├── modules/            # Feature-based modules
│   ├── connection/     # Connection management UI
│   ├── data-viewer/    # Data viewing and exploration UI
│   └── master-console/ # Query editor UI

```

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) to learn how you can help.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
