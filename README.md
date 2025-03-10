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