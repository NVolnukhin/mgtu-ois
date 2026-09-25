import { image } from '../data.ts';

interface PhotoProps {
  /** Ключ картинки в content/images.json. */
  name: string;
  className?: string;
  /** Картинка видна сразу при загрузке страницы — не откладывать её загрузку. */
  eager?: boolean;
}

export function Photo({ name, className, eager = false }: PhotoProps) {
  const { src, alt, position } = image(name);
  return (
    <img
      className={className ? `photo ${className}` : 'photo'}
      src={src}
      alt={alt}
      width={1200}
      height={800}
      style={{ objectPosition: position }}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
    />
  );
}
