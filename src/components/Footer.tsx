import { Link } from "react-router-dom";
import "./Footer.css";

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        <p className="footer-text">© 2025 Natal dos Ferreira - Amigo Chocolate</p>
        <Link to="/regras" className="footer-link">
          Regras do Jogo
        </Link>
      </div>
    </footer>
  );
};

export default Footer;
