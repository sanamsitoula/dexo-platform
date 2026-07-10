import { redirect } from 'next/navigation';

export default function SignupIndexRedirect() {
  redirect('/signup/create');
}
