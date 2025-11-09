# Contributing to MyDbPortal Studio

First off, thank you for considering contributing to MyDbPortal Studio! It's people like you that make open source such a great community.

We welcome any type of contribution, not just code. You can help with:
* **Reporting a bug**
* **Discussing the current state of the code**
* **Submitting a fix**
* **Proposing new features**
* **Becoming a maintainer**

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v20.0 or higher)

### Development Environment Setup

1. **Fork the repository** on GitHub.
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/your-username/mydbportal-studio.git
   cd mydbportal-studio
   ```
3. **Install dependencies** using Bun:
   ```bash
   bun install
   ```
4. **Run the development server**:
   ```bash
   bun dev
   ```
   The application will be available at `http://localhost:3000`.

## Development Workflow

### Making Changes

1. Create a new branch for your feature or bug fix:
   ```bash
   git checkout -b my-awesome-feature
   ```
2. Make your changes to the codebase.
3. **Lint your code** to ensure it follows the project's style guidelines:
   ```bash
   bun lint
   ```
4. **Build the project** to make sure everything compiles correctly:
    ```bash
    bun build
    ```
5. Commit your changes with a descriptive commit message:
   ```bash
   git commit -m "feat: add my awesome feature"
   ```
   While we don't enforce a strict commit message format, we encourage you to write clear and concise messages.

### Submitting a Pull Request

1. Push your branch to your fork:
   ```bash
   git push origin my-awesome-feature
   ```
2. Open a pull request to the `main` branch of the original repository.
3. Fill out the pull request template with the required information.
4. Your pull request will be reviewed by the maintainers. Be prepared to answer questions and make changes if requested.

## Coding Style

We use [ESLint](https://eslint.org/) with the standard Next.js configuration to enforce a consistent coding style. Before submitting a pull request, please run `bun lint` and fix any reported issues.

The project uses [Tailwind CSS](https://tailwindcss.com/) for styling and [shadcn/ui](https://ui.shadcn.com/) for components. Please adhere to the existing conventions when adding or modifying UI elements.

## Reporting Bugs and Suggesting Features

We use GitHub Issues to track bugs and feature requests.

- **To report a bug**, please open an issue with the "Bug Report" template and provide as much detail as possible.
- **To suggest a feature**, please open an issue with the "Feature Request" template and describe your idea.

## Questions?

If you have any questions, feel free to open an issue or join our community channels.

Thank you for your contribution!
