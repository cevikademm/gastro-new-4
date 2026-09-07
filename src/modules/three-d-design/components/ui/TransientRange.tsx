/**
 * TransientRange — `<input type="range">` whose whole drag is ONE undo step.
 *
 * Every `onChange` tick still writes to the project store (2D/3D preview live),
 * but the history middleware is put in a transient batch on pointer/key down
 * and committed on release, so a slider sweep never floods the 100-entry
 * history or destroys earlier undo steps.
 */
import { useCallback, useEffect, useRef, type InputHTMLAttributes } from 'react';
import { useProjectStore } from '../../store';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

export default function TransientRange(props: Props) {
  const beginTransient = useProjectStore((s) => s.beginTransient);
  const commitTransient = useProjectStore((s) => s.commitTransient);
  const openRef = useRef(false);

  const start = useCallback(() => {
    if (openRef.current) return;
    openRef.current = true;
    beginTransient();
  }, [beginTransient]);

  const end = useCallback(() => {
    if (!openRef.current) return;
    openRef.current = false;
    commitTransient();
  }, [commitTransient]);

  // Release even if the pointer goes up outside the input, and on unmount.
  useEffect(() => {
    const onUp = () => end();
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      end();
    };
  }, [end]);

  const { onPointerDown, onPointerUp, onKeyDown, onKeyUp, onBlur, className, ...rest } = props;

  return (
    <input
      type="range"
      {...rest}
      className={className}
      onPointerDown={(e) => {
        start();
        onPointerDown?.(e);
      }}
      onPointerUp={(e) => {
        end();
        onPointerUp?.(e);
      }}
      onKeyDown={(e) => {
        start();
        onKeyDown?.(e);
      }}
      onKeyUp={(e) => {
        end();
        onKeyUp?.(e);
      }}
      onBlur={(e) => {
        end();
        onBlur?.(e);
      }}
    />
  );
}
