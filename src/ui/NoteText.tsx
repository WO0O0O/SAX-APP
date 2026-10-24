// DM Serif Display has no ♯/♭ glyphs; set them in the UI font so names like "B♭3" stay tight.
export function NoteText({ text }: { text: string }) {
  return (
    <>
      {text.split(/([♯♭𝄪𝄫])/u).map((part, i) =>
        /[♯♭𝄪𝄫]/u.test(part) ? (
          <span key={i} className="font-sans text-[0.72em] font-semibold">
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </>
  );
}
