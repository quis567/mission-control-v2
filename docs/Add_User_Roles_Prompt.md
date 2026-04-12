# Add User Roles — Claude Code Prompt

Read the project context file: `Mission_Control_v2_Project_Context.md`

## Goal

Add a simple user role system with two roles: **Admin** and **Member**. The only difference is that Admins can manage users (add, edit, remove). All other permissions are identical — every user can access and use all features of the app.

---

## Database Changes

### Update the User model to include a role field:

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String
  name      String?
  role      String   @default("member")  // "admin" or "member"
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

Run `npx prisma db push` after updating the schema.

### Set the existing user as admin:

The current user (admin@truepathstudios.com) should be set to role "admin":

```sql
UPDATE users SET role = 'admin' WHERE email = 'admin@truepathstudios.com';
```

Or via Prisma:
```javascript
await prisma.user.update({
  where: { email: 'admin@truepathstudios.com' },
  data: { role: 'admin' }
});
```

---

## Auth Session Updates

Update the NextAuth configuration to include the user's role in the session:

```javascript
// In the NextAuth config (likely in [...nextauth].ts or auth.ts)
callbacks: {
  async session({ session, token }) {
    if (token) {
      session.user.id = token.id;
      session.user.role = token.role;  // Add this
    }
    return session;
  },
  async jwt({ token, user }) {
    if (user) {
      token.id = user.id;
      token.role = user.role;  // Add this
    }
    return token;
  }
}
```

Make sure the `authorize` function in the credentials provider returns the `role` field:

```javascript
async authorize(credentials) {
  const user = await prisma.user.findUnique({
    where: { email: credentials.email }
  });
  if (user && await bcrypt.compare(credentials.password, user.password)) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role  // Include role
    };
  }
  return null;
}
```

---

## User Management Page (Admin Only)

### New page: `/settings/users` (or `/users`)

Add a "Settings" or "Users" link to the sidebar, visible only to admins. Use a gear icon or people icon at the bottom of the sidebar.

**Page layout:**

```
User Management
3 users
                                              [ + Add User ]  (admin only)

┌──────────────────────────────────────────────────────────┐
│  admin@truepathstudios.com          Marc Santiago         │
│  Admin                              Created: Jan 2026     │
│                                                          │
│                                     [ Edit ]              │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│  wife@truepathstudios.com           [Name]               │
│  Member                             Created: Apr 2026     │
│                                                          │
│                                     [ Edit ] [ Remove ]  │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│  brother@truepathstudios.com        [Name]               │
│  Member                             Created: Apr 2026     │
│                                                          │
│                                     [ Edit ] [ Remove ]  │
└──────────────────────────────────────────────────────────┘
```

**Rules:**
- Only admins can see this page
- Only admins can add, edit, or remove users
- An admin cannot remove themselves (prevent locking yourself out)
- The last admin cannot be demoted to member (always need at least one admin)

### Add User Modal:

```
Add New User

Name:           [________________]
Email:          [________________]
Password:       [________________]
Confirm:        [________________]
Role:           [Member ▾]  (options: Admin, Member)

              [ Cancel ]  [ Create User ]
```

- Password must be hashed with bcrypt before saving (same as existing auth)
- Email must be unique — show error if already exists
- Both Admin and Member roles available in the dropdown

### Edit User Modal:

```
Edit User

Name:           [________________]
Email:          [________________]  (read-only)
Role:           [Member ▾]
New Password:   [________________]  (leave blank to keep current)

              [ Cancel ]  [ Save Changes ]
```

- Email cannot be changed (it's the login identifier)
- Password field is optional — only updates if filled in
- Role can be changed by admin

---

## API Endpoints

### `GET /api/users` (admin only)
Returns all users (without password hashes).

```javascript
// Middleware check
const session = await getServerSession(authOptions);
if (session?.user?.role !== 'admin') {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
}

const users = await prisma.user.findMany({
  select: {
    id: true,
    email: true,
    name: true,
    role: true,
    createdAt: true
  },
  orderBy: { createdAt: 'asc' }
});
```

### `POST /api/users` (admin only)
Creates a new user.

```json
{
  "name": "Jane Santiago",
  "email": "jane@truepathstudios.com",
  "password": "SecurePassword123!",
  "role": "member"
}
```

- Hash the password with bcrypt before saving
- Validate email uniqueness
- Return the created user (without password)

### `PUT /api/users/[userId]` (admin only)
Updates a user's name, role, or password.

```json
{
  "name": "Jane Santiago",
  "role": "member",
  "password": "NewPassword123!"  // optional, only if changing
}
```

- If password is provided, hash it before saving
- Prevent demoting the last admin
- Prevent admin from removing their own admin role

### `DELETE /api/users/[userId]` (admin only)
Removes a user.

- Prevent deleting yourself
- Prevent deleting the last admin
- Delete associated sessions too

---

## Sidebar: Show User Info

At the bottom of the sidebar, show the logged-in user's info. Currently there's an "M" avatar — enhance it:

```
┌─────────────────────┐
│  M  Marc Santiago    │
│     Admin            │
│     [ Logout ]       │
└─────────────────────┘
```

- Show name and role
- Show a small "Settings" gear icon that links to `/settings/users` (admin only)
- Keep the logout button

---

## Sidebar: Settings Link (Admin Only)

Add a sidebar nav item for user management, only visible to admins:

```javascript
// In the sidebar component
{session?.user?.role === 'admin' && (
  <NavItem icon={SettingsIcon} href="/settings/users" label="Settings" />
)}
```

Place it near the bottom of the sidebar, above the user avatar/logout area. Use a gear icon.

---

## Route Protection

Add a reusable admin check middleware or wrapper:

```javascript
// lib/adminCheck.ts
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return { authorized: false, status: 401, message: 'Not authenticated' };
  }
  if (session.user.role !== 'admin') {
    return { authorized: false, status: 403, message: 'Admin access required' };
  }
  return { authorized: true, session };
}
```

Use this in all user management API routes:

```javascript
export async function GET() {
  const { authorized, status, message } = await requireAdmin();
  if (!authorized) {
    return NextResponse.json({ error: message }, { status });
  }
  // ... handle request
}
```

Also protect the `/settings/users` page itself — if a non-admin navigates there, redirect to the dashboard.

---

## Password Management

### Admin: Reset Password for Any User

On the user management page (`/settings/users`), each user card should have a "Reset Password" button. When clicked:

1. Show a modal:
```
Reset Password for jane@truepathstudios.com

New Password:      [________________]
Confirm Password:  [________________]

              [ Cancel ]  [ Reset Password ]
```

2. Validate passwords match and meet minimum length (8+ characters)
3. Hash with bcrypt and update the user's password
4. Show success toast: "Password reset for jane@truepathstudios.com"
5. The user will need to use the new password on their next login

**API endpoint:** `POST /api/users/[userId]/reset-password` (admin only)

```json
{
  "newPassword": "NewSecurePassword123!"
}
```

- Admin-only — check role in middleware
- Hash password with bcrypt before saving
- Admin can reset any user's password without knowing the old one

### All Users: Change Own Password

Every user (admin or member) should be able to change their own password. Add this to a "My Account" or "Profile" section accessible from the sidebar user avatar area.

**Location:** Clicking the user avatar/name at the bottom of the sidebar should open a small menu or page:

```
My Account

Name:              [Marc Santiago____]
Email:             admin@truepathstudios.com (read-only)
Role:              Admin (read-only)

Change Password
Current Password:  [________________]
New Password:      [________________]
Confirm Password:  [________________]

              [ Save Changes ]
```

**Rules:**
- User MUST enter their current password to change it (security)
- New password must be 8+ characters
- New password and confirm must match
- If current password is wrong, show error: "Current password is incorrect"
- On success, show toast: "Password updated successfully"
- User stays logged in after changing password

**API endpoint:** `PUT /api/users/me/password`

```json
{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewPassword456!"
}
```

Logic:
```javascript
// Get the logged-in user from session
const session = await getServerSession(authOptions);
const user = await prisma.user.findUnique({ where: { id: session.user.id } });

// Verify current password
const isValid = await bcrypt.compare(currentPassword, user.password);
if (!isValid) {
  return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
}

// Hash and save new password
const hashedPassword = await bcrypt.hash(newPassword, 10);
await prisma.user.update({
  where: { id: user.id },
  data: { password: hashedPassword }
});
```

### My Account Page / Modal

Create a `/settings/account` page or a modal accessible from the sidebar avatar. This is available to ALL users (admin and member):

- **Edit name** — user can update their own display name
- **View email** — read-only (can't change login email)
- **View role** — read-only (only admins can change roles)
- **Change password** — current + new + confirm fields

Add a small link or menu from the sidebar user avatar:
```
┌─────────────────────┐
│  M  Marc Santiago    │
│     Admin            │
│  [ My Account ]      │
│  [ Logout ]          │
└─────────────────────┘
```

---

## Non-Admin Experience

Members see and can do everything admins can EXCEPT:
- They do NOT see the "Settings" link in the sidebar
- They CANNOT access `/settings/users` (redirected to dashboard)
- They CANNOT call user management API endpoints (403 error)

Everything else — clients, websites, SEO, pipeline, tasks, proposals, reports, revenue, agents — is fully accessible to all users.

---

## Design Notes

- Keep the dark navy/teal glassmorphism theme
- User cards should be simple glassmorphic cards
- Role badges: "Admin" in teal pill, "Member" in gray pill
- The Add User modal should match existing modal styles in the app
- The sidebar user section should be compact — name, role, and logout
- Settings gear icon: small, muted, only appears for admins

---

## After making changes:

1. Run `npx prisma db push` to update the schema
2. Update the existing user to role "admin"
3. Test login — verify role appears in session
4. Test adding a new user as admin
5. Test that new user can log in
6. Test that new user CANNOT access user management
7. Test editing a user's role and password
8. Test that the last admin cannot be demoted
9. Test admin resetting another user's password — verify new password works on login
10. Test changing your own password via My Account — verify old password is required
11. Test wrong current password shows error
12. Test the My Account page is accessible to both admin and member users
13. Deploy: `vercel --prod` or `git push`
