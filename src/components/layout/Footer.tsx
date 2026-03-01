export default function Footer() {
  return (
    <footer className="border-t border-border bg-surface py-6">
      <div className="max-w-screen-xl mx-auto px-4 text-center text-sm text-muted">
        <p>&copy; {new Date().getFullYear()} 개혁 충남. All rights reserved.</p>
      </div>
    </footer>
  );
}
