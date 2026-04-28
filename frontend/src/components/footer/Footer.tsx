const Footer = () => {
  return (
    <footer className="flex justify-between flex-wrap items-center h-20 border-t border-gray-300 px-4 py-3">
      <p className="text-[#576F76]">Copyright © 2026, MINI-REDDIT.</p>
      {/* <p className="text-[#576F76]">alex.frontender@gmail.com</p> */}
      <a
        href="mailto:alex.frontender@gmail.com"
        className="text-[#576F76] font-medium hover:underline transition-all"
      >
        alex.frontender@gmail.com
      </a>
    </footer>
  );
};

export default Footer;
