# Supabase Functions Deployment

This project includes automated scripts to deploy all Supabase Edge Functions to your Supabase project.

## Prerequisites

1. **Supabase CLI**: Make sure you have the Supabase CLI installed globally:
   ```bash
   npm install -g supabase
   ```

2. **Authentication**: Ensure you're logged in to Supabase:
   ```bash
   supabase login
   ```

3. **Project Link**: Make sure your local project is linked to your Supabase project:
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```

## Available Scripts

### PowerShell Script (Windows)

The main deployment script is `deploy-functions.ps1` which is optimized for Windows PowerShell.

#### Usage Options:

```powershell
# Deploy all functions (interactive)
.\deploy-functions.ps1

# Dry run - see what would be deployed without actually deploying
.\deploy-functions.ps1 -DryRun

# Verbose output - see detailed deployment information
.\deploy-functions.ps1 -Verbose

# Combine options
.\deploy-functions.ps1 -DryRun -Verbose
```

#### NPM Scripts (Windows):

```bash
# Deploy all functions
npm run deploy:functions

# Dry run
npm run deploy:functions:dry

# Verbose deployment
npm run deploy:functions:verbose
```

### Bash Script (Unix/Linux/macOS)

For cross-platform compatibility, there's also a bash script `deploy-functions.sh`.

#### Usage Options:

```bash
# Make the script executable (first time only)
chmod +x deploy-functions.sh

# Deploy all functions (interactive)
./deploy-functions.sh

# Dry run
./deploy-functions.sh --dry-run

# Verbose output
./deploy-functions.sh --verbose

# Show help
./deploy-functions.sh --help
```

#### NPM Scripts (Unix):

```bash
# Deploy all functions
npm run deploy:functions:unix

# Dry run
npm run deploy:functions:unix:dry

# Verbose deployment
npm run deploy:functions:unix:verbose
```

## What the Scripts Do

1. **Prerequisites Check**: Verify that Supabase CLI is installed and you're in a valid Supabase project
2. **Function Discovery**: Automatically find all function directories in `supabase/functions/` (excluding `__shared_data`)
3. **Deployment**: Deploy each function sequentially with error handling
4. **Progress Tracking**: Show real-time progress and status for each function
5. **Summary Report**: Provide a detailed summary of successful and failed deployments

## Functions That Will Be Deployed

Based on your current project structure, the following functions will be deployed:

- `create-room`
- `end-game`
- `end-round`
- `get-random-words`
- `start-game`
- `start-round`
- `submit-guess`

## Features

- **Color-coded output** for easy reading
- **Error handling** with detailed error messages
- **Dry run mode** to preview what would be deployed
- **Verbose mode** for detailed output
- **Rate limiting protection** with delays between deployments
- **Individual retry suggestions** for failed functions
- **Interactive confirmation** before deployment

## Troubleshooting

### Common Issues

1. **"Supabase CLI not found"**
   - Install the CLI: `npm install -g supabase`

2. **"Not a Supabase project"**
   - Make sure you're running the script from the project root
   - Ensure `supabase/config.toml` exists

3. **"Permission denied" (Unix)**
   - Make the script executable: `chmod +x deploy-functions.sh`

4. **"Execution policy" error (Windows)**
   - The npm scripts handle this automatically
   - Or run: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

5. **Function deployment fails**
   - Check the function's `index.ts` for syntax errors
   - Verify the function has a valid `deno.json` configuration
   - Check your Supabase project's function limits

### Manual Deployment

If you need to deploy a single function manually:

```bash
supabase functions deploy FUNCTION_NAME
```

### Checking Function Status

To see the status of your deployed functions:

```bash
supabase functions list
```

## Best Practices

1. **Always test with dry run first** before deploying to production
2. **Use verbose mode** when debugging deployment issues
3. **Deploy during low-traffic periods** to minimize service disruption
4. **Monitor function logs** after deployment to ensure everything works correctly
5. **Keep your Supabase CLI updated** for the latest features and bug fixes

## CI/CD Integration

You can integrate these scripts into your CI/CD pipeline by using the non-interactive versions:

```bash
# For automated deployments (no confirmation prompt)
echo "y" | ./deploy-functions.sh
```

Or modify the scripts to accept a `--non-interactive` flag for automated environments. 