# the reading room

A shared reading wheel for you and your friends. Everyone in a room adds links, and each day a wheel picks one article for the whole room to read.

- Each link is one slice of the wheel: pale blue if you added it, green if someone else did.
- You can't see other people's titles until their link is picked.
- The first person to open the app each day spins. The pick is locked for everyone until tomorrow (South African time).
- Mark the article as read to see who else has. A link leaves the wheel once everyone has read it.

## Stack

- **Next.js 16** (App Router, TypeScript, Tailwind)
- **Supabase** for the database, magic-link login and Row Level Security
- **Vercel** for hosting

## Run it locally

1. Install dependencies:

   ```
   npm install
   ```

2. Create a free project at [supabase.com](https://supabase.com). In Project Settings → API, copy the Project URL and the anon public key into `.env.local`:

   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```

3. Set up the database: run each file in `supabase/` in the Supabase SQL editor, in order from `01` to `08`.
   - `00_*` files are a throwaway connection test from step 1; skip them.
   - `dev_reset.sql` deletes every link, pick and read. It's for testing only.

4. Set up login in Supabase → Authentication:
   - **Sign In / Providers:** turn Email on, and allow new users to sign up.
   - **URL Configuration:** set the Site URL to `http://localhost:3000` and add `http://localhost:3000/**` to the Redirect URLs.

5. Start the app and open [http://localhost:3000](http://localhost:3000):

   ```
   npm run dev
   ```

## Deploy

1. Import the repo on [vercel.com](https://vercel.com) and add the two `NEXT_PUBLIC_SUPABASE_...` environment variables.
2. In Supabase → Authentication → URL Configuration, set the Site URL to your Vercel address and add `https://your-app.vercel.app/**` to the Redirect URLs.

Every push to `main` then updates the live site.

## How it's built

| Where | What it does |
| --- | --- |
| `app/page.tsx` | The homepage: the wheel and spin before today's pick, the article card after it |
| `app/login/`, `app/auth/callback/` | Magic-link login |
| `app/join/` | Joining a room from an invite link |
| `app/api/fetch-title/` | Server route that reads an article's title, description and image |
| `proxy.ts` | Keeps the login fresh and sends logged-out visitors to `/login` |
| `components/` | The wheel, today's card, your links, the invite box and the header |
| `supabase/` | Every table, rule and database function, in the order they were added |

The rules about who can see what live in the database, not in the page:

- **Rooms:** Row Level Security limits every table to your own room.
- **Secret titles:** other people's unpicked links come back only as bare slices, from `wheel_slices()`, with no URL or title.
- **The daily pick:** `spin()` runs in the database, and a unique rule allows one pick per room per day. If two people spin at once, only one pick is saved and both see it.
