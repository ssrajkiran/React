export default function Footer() {
  return (
    <footer className="app-footer">
      <div className="footer-inner">
        <span>&copy; {new Date().getFullYear()} Voltech. All rights reserved.</span>
        <span className="footer-divider">·</span>
        <span>Developed by Software Development</span>
      </div>
    </footer>
  );
}
