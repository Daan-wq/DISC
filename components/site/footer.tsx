export default function Footer() {
  return (
    <footer className="border-t border-border bg-background/80 py-6 mt-auto">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} DISC Profile. All rights reserved.
          </p>
          <nav className="flex items-center gap-6">
            <a href="https://tlcprofielen.nl/privacybeleid/" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Privacy
            </a>
            <a href="https://tlcprofielen.nl/algemene-voorwaarden/" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Terms
            </a>
            <a href="https://tlcprofielen.nl/contact/" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Contact
            </a>
          </nav>
        </div>
      </div>
    </footer>
  )
}
