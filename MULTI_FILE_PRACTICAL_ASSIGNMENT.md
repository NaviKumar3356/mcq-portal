# Multi-file Practical Assignment

## How it works

1. In **New Question Paper**, add a **Practical** question.
2. Select a file-based practical type such as **MS Excel, MS Word, PowerPoint, GIMP, Canva, Scratch, or Other**.
3. Use **Upload multiple student task files** and select all task files in one operation.
4. The portal stores each selected file as a practical variant.
5. Assignment is deterministic by class roster order (roll-number order):
   - Student 1 gets Task 1
   - Student 2 gets Task 2
   - ...
   - after the last task file, assignment repeats from Task 1.
6. On every test load, the server recomputes the same assignment from the student's roster rank. Refreshing or restarting after a power failure therefore does not randomly change the assigned task (assuming the roster order has not changed).
7. Students receive only their assigned task file; the other task files are never sent to the browser.
8. The assigned resource is included in the practical variant snapshot when the student submits, so the teacher can see which task was assigned.

## Example: 6 files / 13 students

Task files: 1, 2, 3, 4, 5, 6

Student roster assignment:

1→1, 2→2, 3→3, 4→4, 5→5, 6→6, 7→1, 8→2, 9→3, 10→4, 11→5, 12→6, 13→1

The existing practical variant assignment mechanism is reused; no new Supabase table is required for this feature.
