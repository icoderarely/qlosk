// The admin pages all read the session, which is request-time work. This gives
// them one Suspense boundary under the shared layout so navigations stay instant.
export default function Loading() {
  return <div className="min-h-[50dvh]" role="status" aria-label="Loading" />;
}
