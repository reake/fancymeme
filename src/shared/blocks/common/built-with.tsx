import Link from 'next/link';

import { Button } from '@/shared/components/ui/button';

export function BuiltWith() {
  return (
    <Button asChild variant="outline" size="sm" className="hover:bg-primary/10">
      <Link href="https://fancymeme.ai" target="_blank">
        Built with ❤️ fancymeme
      </Link>
    </Button>
  );
}
