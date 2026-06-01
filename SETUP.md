# How to publish this guide on GitHub Pages

Follow these steps to put this study guide online for free using GitHub.

---

## Step 1 — Create a GitHub account

If you don't have one yet:
1. Go to [https://github.com](https://github.com)
2. Click **Sign up**
3. Follow the instructions to create a free account

---

## Step 2 — Create a new repository

1. Log in to GitHub
2. Click the **+** button (top right) → **New repository**
3. Name it: `dynaspeak-prep` (or any name you like)
4. Set it to **Public** (required for free GitHub Pages)
5. Do **not** tick "Add a README" (we already have one)
6. Click **Create repository**

---

## Step 3 — Open the project in VS Code

1. Open **VS Code**
2. Go to **File → Open Folder**
3. Select the `dynaspeak-prep` folder you downloaded

---

## Step 4 — Install the recommended VS Code extensions (optional but helpful)

Open the Extensions panel (`Ctrl+Shift+X`) and install:
- **Markdown Preview Enhanced** — preview your markdown files
- **GitHub Copilot** or **Markdown All in One** — optional helpers

---

## Step 5 — Push to GitHub using VS Code

### Option A — Using VS Code's built-in Git panel

1. Click the **Source Control** icon in the left sidebar (looks like a branch)
2. Click **Initialize Repository**
3. You will see all files listed under "Changes"
4. Type a commit message in the box: `Initial commit — DynaSpeak prep guide`
5. Click the **✓ Commit** button (or press `Ctrl+Enter`)
6. Click **Publish Branch**
7. VS Code will ask you to connect to GitHub — follow the prompts
8. Choose **Public** repository
9. VS Code will push all files to GitHub

### Option B — Using the terminal in VS Code

Open the terminal (`Ctrl+`` `) and run these commands one by one:

```bash
git init
git add .
git commit -m "Initial commit — DynaSpeak prep guide"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/dynaspeak-prep.git
git push -u origin main
```

Replace `YOUR-USERNAME` with your actual GitHub username.

---

## Step 6 — Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** (top menu)
3. In the left sidebar, click **Pages**
4. Under **Source**, select **GitHub Actions**
5. The workflow file (`.github/workflows/deploy.yml`) will automatically build and deploy your site

---

## Step 7 — Wait for deployment

1. Go to the **Actions** tab in your repository
2. You will see a workflow running — wait for it to show a green tick ✅
3. This takes about 2–3 minutes

---

## Step 8 — View your live site

Your site will be live at:

```
https://YOUR-USERNAME.github.io/dynaspeak-prep/
```

Replace `YOUR-USERNAME` with your GitHub username.

---

## Updating the content later

To edit a lesson or quiz:
1. Open the file in VS Code
2. Make your changes
3. Save the file (`Ctrl+S`)
4. Go to Source Control → commit with a message → push

GitHub Actions will automatically rebuild and redeploy the site.

---

## File structure reference

```
dynaspeak-prep/
├── README.md                    ← Home page
├── _config.yml                  ← Site settings
├── .gitignore
├── .github/
│   └── workflows/
│       └── deploy.yml           ← Auto-deploy to GitHub Pages
├── lessons/
│   ├── 01-verb-to-be.md
│   ├── 02-present-simple.md
│   ├── 03-present-continuous.md
│   ├── 04-past-simple.md
│   ├── 05-articles.md
│   ├── 06-vocabulary.md
│   ├── 07-speaking-intro.md
│   ├── 08-speaking-questions.md
│   ├── 09-reading-strategies.md
│   └── 10-writing-structure.md
└── quizzes/
    ├── quiz-grammar.md
    ├── quiz-vocabulary.md
    ├── quiz-reading.md
    ├── quiz-writing.md
    └── mock-test.md
```

---

## Need help?

- GitHub Docs: [https://docs.github.com/en/pages](https://docs.github.com/en/pages)
- VS Code Git guide: [https://code.visualstudio.com/docs/sourcecontrol/overview](https://code.visualstudio.com/docs/sourcecontrol/overview)
