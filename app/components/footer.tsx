export function Footer() {
  return (
    <footer className="border-t p-6 md:py-0">
      <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row">
        <p className="text-sm text-muted-foreground text-center md:text-left">
          &copy; {new Date().getFullYear()} Bluesky Follower Cleaner. by
          @lanceliang.bsky.social
        </p>
      </div>
    </footer>
  );
}
