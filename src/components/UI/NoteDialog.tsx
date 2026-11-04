import { useAppStore } from '../../data/store';
import { Modal } from './Modal';
import { Sticker } from '../Stickers/Sticker';

export function NoteDialog() {
  const note = useAppStore((state) => state.note);
  const hideNote = useAppStore((state) => state.hideNote);

  return (
    <Modal open={Boolean(note)} onClose={hideNote} title={note?.title || 'A little something'} size="sm">
      <div className="relative px-5 pb-8 pt-4">
        <div className="relative rounded-[4px] bg-[#fdf4e4] px-5 py-7 shadow-paper">
          <p className="whitespace-pre-wrap font-hand text-2xl leading-[1.55] text-[#4a373d] sm:text-[1.7rem]">
            {note?.body}
          </p>
          <span className="pointer-events-none absolute -right-2 -top-3 block h-12 w-12 rotate-6">
            <Sticker id="heart" />
          </span>
        </div>
        <div className="mt-4 flex justify-center">
          <button type="button" className="btn btn-secondary min-h-9" onClick={hideNote}>
            Keep this close
          </button>
        </div>
      </div>
    </Modal>
  );
}
