Origin: Ancient Greek
Meaning:
\koinonia
\koinonia (κοινωνία) conveys "community," "partnership," and "shared life"—a core value in New Testament teachings.

## Deployment

### Environment Variables

This application requires the following environment variables:

- `OPENAI_API_KEY`: Your OpenAI API key for generating questions

When deploying to Vercel, you need to add these environment variables in the Vercel dashboard:

1. Go to your project in the Vercel dashboard
2. Navigate to Settings > Environment Variables
3. Add the `OPENAI_API_KEY` variable with your OpenAI API key
4. Deploy your application

### Local Development

1. Clone the repository
2. Copy `.env.example` to `.env` and fill in your API keys
3. Install dependencies with `npm install`
4. Run the development server with `npm run dev`
5. Open [http://localhost:3000](http://localhost:3000) in your browser

### Security Note

The application is designed to keep your API keys secure by:

- Using server-side API routes to make OpenAI API calls
- Never exposing API keys to the client-side code
- Storing environment variables securely in Vercel
- Implementing rate limiting to prevent abuse
- Using secure HTTP headers to protect against common web vulnerabilities
- Encrypting sensitive data stored in localStorage
- Validating and sanitizing all user inputs

### Security Best Practices

When deploying this application, please follow these additional security best practices:

1. **HTTPS Only**: Always deploy behind HTTPS to protect data in transit
2. **Keep Dependencies Updated**: Regularly update npm packages to patch security vulnerabilities
3. **Use Strong Session Secret**: Use a strong, unique random string for the SESSION_SECRET environment variable
4. **Regular Backups**: Implement regular backups of any important user data
5. **Security Headers**: The application configures security headers, but verify they're working using tools like [SecurityHeaders.com](https://securityheaders.com)
6. **Monitoring**: Implement monitoring and logging to detect unusual activity
7. **Access Control**: Restrict access to your deployment environment and API keys
