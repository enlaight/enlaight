# Creating Workflows in n8n

This guide walks you through the process of setting up n8n and creating workflows for use in the application.

## Step 1: Build and Start the Application for the First Time

Before creating workflows, you need to build and start the application.

### Using Docker Compose

1. Navigate to the project root directory:

2. Start the application using the commands in the Makefile:
   ```bash
   make build
   make start
   ```

3. Once running, access n8n at `http://localhost:5678` (or configured port)

## Step 2: Create Owner/Admin Account for First Time

When you first access n8n, you'll be prompted to create an owner account.

1. Navigate to n8n at `http://localhost:5678`

2. You'll see a setup screen prompting you to create your owner/admin account

3. Fill in the following details:
   - **Email**: Your admin email address
   - **Password**: A strong password (store this securely)
   - **First Name** and **Last Name**: Your name

4. Click **Finish Setup** to complete account creation

5. You'll be logged in automatically and can now access the n8n dashboard

## Step 3: Generate and Store n8n API Key

To programmatically create and manage workflows, you need to generate an API key.

1. In the n8n dashboard, locate the **admin account icon** at the **bottom left** of the screen

2. Click on it to open the menu

3. Select **Settings**

4. In the Settings panel, navigate to the **n8n API** section

5. Click **Create an API Key** button

6. A new API key will be generated. **Copy it immediately**

7. Store this API key in a **secure location**, such as:
   - Environment variable file (`.env`)
   - Password manager
   - Secure note-taking application

   **Important**: Do not commit API keys to version control. Add `.env` files to `.gitignore`

8. You'll also need the **n8n base URL** (e.g., `http://localhost:5678` for local setup)

## Step 4: Use the `create_n8n_workflow` Script

Now that you have the API key, you can use the provided script to create workflows.

### Script Location

The script is located at: `n8n/scripts/create_n8n_workflow.py`

### Prerequisites

1. **API Key**: From Step 3 above
2. **n8n Base URL**: The URL where n8n is running (e.g., `http://localhost:5678`)
3. **Workflow JSON File**: A workflow definition file from the `n8n/workflows/` folder

### Available Workflows

The following pre-built workflows are available in `n8n/workflows/`:

- `add-file-kb.json` - Add files to knowledge base
- `agent-data-analyst.json` - Data analyst agent workflow
- `create-kb.json` - Create knowledge base
- `delete-files-kb.json` - Delete files from knowledge base
- `delete-kb.json` - Delete knowledge base
- `edit-kb.json` - Edit knowledge base
- `get-all-kb.json` - Get all knowledge bases
- `get-kb.json` - Get specific knowledge base
- `list-files-kb.json` - List files in knowledge base
- `youscan-collect-mentions.json` - Collect mentions from YouScan
- `youscan-normalize-mentions.json` - Normalize mentions from YouScan

### Running the Script

1. Open a new terminal window and navigate to the `n8n` folder:
   ```bash
   cd n8n
   ```

2. Run the script with your actual API key, base URL, and chosen workflow. Replace the placeholder values:
   ```bash
   python scripts/create_n8n_workflow.py
   ```

   **Replace the following variables inside the script:**
   - `API_KEY` - The n8n API key generated in Step 3
   - `N8N_BASE_URL` - The n8n base URL (adjust if using a different host/port)
   - `JSON_FILE` - Your chosen workflow file from the workflows folder

3. If the script succeeds, you'll receive a response with the workflow ID and details

4. The workflow will now be available in your n8n instance

### Troubleshooting

- **Invalid API Key**: Verify the API key is correct and hasn't been revoked
- **Connection Error**: Ensure n8n is running and accessible at the provided base URL
- **File Not Found**: Double-check the path to the workflow JSON file
- **Permission Denied**: Ensure you have created the admin account on n8n and created an API key that has permission to create workflows

## Next Steps

Once workflows are created, you can:
- Execute them from the n8n UI
- Integrate them with your application backend
- Monitor their execution in the n8n execution logs
- Modify and test workflows as needed
