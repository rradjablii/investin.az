import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import FilterSheet from "@/components/explore/FilterSheet";
import PropertyCard from "@/components/explore/PropertyCard";
import Gallery from "@/components/property/Gallery";
import { EMPTY_FILTERS } from "@/lib/filters";
import { summary } from "./fixtures";

describe("PropertyCard", () => {
  it("shows price in its original currency, specs, and unknown values honestly", () => {
    render(<ul><PropertyCard property={summary({ bedrooms: null, bathrooms: null, askingPrice: 571000, currency: "AZN" })}
      selected={false} onSelect={() => {}} detailHref="/properties/flat-1" /></ul>);
    expect(screen.getByText("₼571,000")).toBeInTheDocument();
    expect(screen.queryByText(/0 bd/)).not.toBeInTheDocument(); // unknown is not zero
    expect(screen.getByText("60 m²")).toBeInTheDocument();
  });

  it("communicates selection with text and aria, not only colour", () => {
    render(<ul><PropertyCard property={summary()} selected onSelect={() => {}} detailHref="/x" /></ul>);
    expect(screen.getByText("Selected")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Selected: Sunny flat/ })).toHaveAttribute("aria-pressed", "true");
  });

  it("calls onSelect with the slug and links to details", async () => {
    const onSelect = vi.fn();
    render(<ul><PropertyCard property={summary()} selected={false} onSelect={onSelect} detailHref="/properties/flat-1?from=a" /></ul>);
    await userEvent.click(screen.getByRole("button", { name: /Select Sunny flat/ }));
    expect(onSelect).toHaveBeenCalledWith("flat-1");
    expect(screen.getByRole("link", { name: /View details/ })).toHaveAttribute("href", "/properties/flat-1?from=a");
  });

  it("flags fictional demonstration data", () => {
    render(<ul><PropertyCard property={summary({ demonstration: true })} selected={false} onSelect={() => {}} detailHref="/x" /></ul>);
    expect(screen.getByText("Fictional demo")).toBeInTheDocument();
  });

  it("toggles the save control", async () => {
    render(<ul><PropertyCard property={summary()} selected={false} onSelect={() => {}} detailHref="/x" /></ul>);
    const save = screen.getByRole("button", { name: /Save Sunny flat/ });
    expect(save).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(save);
    expect(screen.getByRole("button", { name: /Remove Sunny flat from saved/ })).toHaveAttribute("aria-pressed", "true");
  });

  it("falls back when the image is missing", () => {
    render(<ul><PropertyCard property={summary({ primaryImage: null })} selected={false} onSelect={() => {}} detailHref="/x" /></ul>);
    expect(screen.getByRole("img", { name: /No photograph available/ })).toBeInTheDocument();
  });
});

describe("FilterSheet", () => {
  const hoods = [{ slug: "nasimi", name: "Nasimi", description: null, centerLatitude: 0, centerLongitude: 0, listingCount: 3 }];

  it("keeps edits pending until Apply", async () => {
    const onApply = vi.fn();
    render(<FilterSheet filters={EMPTY_FILTERS} neighborhoods={hoods} onApply={onApply} onClose={() => {}} />);
    await userEvent.click(screen.getByLabelText(/House/));
    expect(onApply).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Apply filters" }));
    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ type: ["house"] }));
  });

  it("requires a currency for price and blocks Apply", async () => {
    render(<FilterSheet filters={EMPTY_FILTERS} neighborhoods={hoods} onApply={() => {}} onClose={() => {}} />);
    const group = screen.getByRole("group", { name: "Asking price" });
    await userEvent.type(within(group).getByLabelText("Min"), "100");
    expect(screen.getByRole("alert")).toHaveTextContent(/currency/i);
    expect(screen.getByRole("button", { name: "Apply filters" })).toBeDisabled();
    await userEvent.selectOptions(within(group).getByLabelText("Currency"), "USD");
    expect(screen.getByRole("button", { name: "Apply filters" })).toBeEnabled();
  });

  it("validates inverted ranges", async () => {
    render(<FilterSheet filters={{ ...EMPTY_FILTERS, currency: "USD" }} neighborhoods={hoods} onApply={() => {}} onClose={() => {}} />);
    const group = screen.getByRole("group", { name: "Asking price" });
    await userEvent.type(within(group).getByLabelText("Min"), "500");
    await userEvent.type(within(group).getByLabelText("Max"), "100");
    expect(screen.getByText(/Minimum price is higher than maximum/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Apply filters" })).toBeDisabled();
  });

  it("resets all pending edits and closes on Escape", async () => {
    const onClose = vi.fn();
    render(<FilterSheet filters={{ ...EMPTY_FILTERS, type: ["house"], neighborhood: "nasimi" }} neighborhoods={hoods} onApply={() => {}} onClose={onClose} />);
    expect(screen.getByLabelText(/House/)).toBeChecked();
    await userEvent.click(screen.getByRole("button", { name: "Reset all" }));
    expect(screen.getByLabelText(/House/)).not.toBeChecked();
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });
});

describe("Gallery", () => {
  const images = [{ url: "/a.jpg", alt: "First" }, { url: "/b.jpg", alt: "Second" }];
  it("navigates between photographs and reports position", async () => {
    render(<Gallery images={images} />);
    expect(screen.getByText("Photo 1 of 2")).toBeInTheDocument();
    expect(screen.getByAltText("First")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Next photograph" }));
    expect(screen.getByAltText("Second")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Next photograph" }));
    expect(screen.getByAltText("First")).toBeInTheDocument(); // wraps
  });
  it("shows a placeholder when there are no photographs", () => {
    render(<Gallery images={[]} />);
    expect(screen.getByRole("img", { name: /No photograph/ })).toBeInTheDocument();
  });
});
