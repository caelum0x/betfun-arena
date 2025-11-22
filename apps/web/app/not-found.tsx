import Link from "next/link";
import { Button } from "../components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-black via-gray-900 to-black">
      <div className="text-center px-4">
        <div className="text-6xl mb-4">⚔️</div>
        <h1 className="text-h1 font-bold text-gradient-purple mb-4">
          404 - Arena Not Found
        </h1>
        <p className="text-body text-gray-400 mb-8 max-w-md mx-auto">
          The battle arena you're looking for doesn't exist or has been closed.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/feed">
            <Button variant="default">Explore Arenas</Button>
          </Link>
          <Link href="/">
            <Button variant="ghost">Go Home</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

