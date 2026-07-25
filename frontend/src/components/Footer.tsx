import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-[#2B2620] text-[#EDE7D9] mt-12">
      <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-1 sm:grid-cols-3 gap-8 text-sm">
        <div>
          <h3 className="font-display text-base mb-3">Help</h3>
          <ul className="space-y-2 opacity-80">
            <li>How to Buy</li>
            <li>How to Rent a Book</li>
            <li>FAQ</li>
          </ul>
        </div>
        <div>
          <h3 className="font-display text-base mb-3">ReadAca</h3>
          <ul className="space-y-2 opacity-80">
            <li>About ReadAca</li>
            <li>Terms &amp; Conditions</li>
            <li>Privacy Policy</li>
          </ul>
        </div>
        <div>
          <h3 className="font-display text-base mb-3">Quick Links</h3>
          <ul className="space-y-2">
            <li><Link href="/browse" className="hover:text-[#A67C3D]">Browse Books</Link></li>
            <li><Link href="/orders" className="hover:text-[#A67C3D]">My Orders</Link></li>
            <li><Link href="/wallet" className="hover:text-[#A67C3D]">Wallet</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-[#3d372e] px-6 py-4 text-center text-xs opacity-70 font-mono">
        © {new Date().getFullYear()} ReadAca Malaysia. All rights reserved to Abdul Rafay.
      </div>
    </footer>
  );
}