'use client';

import Link from 'next/link';
import {Button, ButtonProps} from '@mui/material';

interface LinkButtonProps extends Omit<ButtonProps, 'href' | 'component'> {
  href: string;
}

export function LinkButton({href, children, ...props}: LinkButtonProps) {
  return (
    <Link href={href} style={{textDecoration: 'none'}}>
      <Button {...props}>{children}</Button>
    </Link>
  );
}
