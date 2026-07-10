import { redirect } from 'next/navigation';

// There is no separate "register" flow — tenant sign-up is the self-service
// /signup/create wizard. Redirect any /register hits there.
export default function RegisterRedirect() {
  redirect('/signup/create');
}
