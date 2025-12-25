import { cn } from "../../lib/utils";
import { useState } from "react";

function Image({
  className,
  src,
  ...props
}: React.ComponentProps<"img"> & { src: string }) {
  const [loading, setLoading] = useState(true);

  return (
    <>
      {loading && (
        <div
          className="w-full h-full bg-gray-300 animate-pulse rounded-md"
          style={{ display: "block" }}
        />
      )}
      <img
        src={src}
        className={cn(loading ? "hidden" : "", className)}
        onLoad={() => setLoading(false)}
        onLoadStart={() => setLoading(true)}
        {...props}
        loading="lazy"
      />
    </>
  );
}

export default Image;
