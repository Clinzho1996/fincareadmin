"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import { DateRange } from "react-day-picker";

export function DateRangePicker({
	dateRange,
	onSelect,
}: {
	dateRange: DateRange | undefined;
	onSelect: (range: DateRange | undefined) => void;
}) {
	const [isOpen, setIsOpen] = useState(false);

	const modifiers = {
		...(dateRange?.from && { start: dateRange.from }),
		...(dateRange?.to && { end: dateRange.to }),
		rangeMiddle: (date: Date) => {
			if (!dateRange?.from || !dateRange?.to) return false;
			return date > dateRange.from && date < dateRange.to;
		},
	};

	return (
		<Popover open={isOpen} onOpenChange={setIsOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					className="w-[240px] justify-start text-left font-normal">
					<CalendarIcon className="mr-2 h-4 w-4" />
					{dateRange?.from ? (
						dateRange.to ? (
							<>
								{format(dateRange.from, "MMM dd, yyyy")} -{" "}
								{format(dateRange.to, "MMM dd, yyyy")}
							</>
						) : (
							format(dateRange.from, "MMM dd, yyyy")
						)
					) : (
						<span>Pick a date range</span>
					)}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-auto p-0 bg-white" align="start">
				<Calendar
					initialFocus
					mode="range"
					defaultMonth={dateRange?.from}
					selected={dateRange}
					onSelect={onSelect}
					numberOfMonths={2}
					modifiers={modifiers}
					modifiersStyles={{
						start: {
							backgroundColor: "#0E5582",
							color: "white",
							borderRadius: "4px",
						},
						end: {
							backgroundColor: "#0E5582",
							color: "white",
							borderRadius: "4px",
						},
						rangeMiddle: {
							backgroundColor: "#ECF3F8",
							borderRadius: "4px",
						},
					}}
				/>
			</PopoverContent>
		</Popover>
	);
}
