"""Helper to label manually. Reads a CSV, writes label column."""
import sys
import pandas as pd


def interactive_label(path: str, output: str):
    df = pd.read_csv(path)
    labels = []
    for i, row in df.iterrows():
        print(f"\n[{i+1}/{len(df)}]")
        print(f"Handle: {row.get('handle', '')}")
        print(f"Bio: {row.get('bio_text', '')[:120]}")
        choice = input("Label (l=Legit, m=Monitor, f=Fake, s=skip): ").strip().lower()
        if choice == "l":
            labels.append("Legit")
        elif choice == "m":
            labels.append("Monitor")
        elif choice == "f":
            labels.append("Fake")
        else:
            labels.append(None)

    df["label"] = labels
    df = df.dropna(subset=["label"])
    df.to_csv(output, index=False)
    print(f"Wrote {len(df)} labeled rows to {output}")


if __name__ == "__main__":
    interactive_label(sys.argv[1], sys.argv[2])
