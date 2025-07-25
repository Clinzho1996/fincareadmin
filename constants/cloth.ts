// types/cloth.ts
export interface Cloth {
	id: string;
	name: string;
	category: string;
	imageUrl: string; // Added image URL
}

export const dummyClothes: Cloth[] = [
	{ id: "1", name: "T-shirt", category: "Top", imageUrl: "/images/shirt.png" },
	{
		id: "2",
		name: "Singlet",
		category: "Top",
		imageUrl: "/images/singlet.png",
	},
	{
		id: "3",
		name: "Trouser",
		category: "Bottom",
		imageUrl: "/images/trouser.png",
	},
	{
		id: "4",
		name: "Bed sheet",
		category: "Home",
		imageUrl: "/images/trouser.png",
	},
	{ id: "5", name: "Skirt", category: "Bottom", imageUrl: "/images/shirt.png" },
	{ id: "6", name: "Shirt", category: "Top", imageUrl: "/images/singlet.png" },
	{
		id: "7",
		name: "Shorts",
		category: "Bottom",
		imageUrl: "/images/trouser.png",
	},
	{
		id: "8",
		name: "Underwears",
		category: "Underwear",
		imageUrl: "/images/singlet.png",
	},
	{
		id: "9",
		name: "Socks",
		category: "Accessory",
		imageUrl: "/images/shirt.png",
	},
	{ id: "10", name: "Towel", category: "Home", imageUrl: "/images/shirt.png" },
	{
		id: "11",
		name: "Joggers",
		category: "Bottom",
		imageUrl: "/images/singlet.png",
	},
	{
		id: "12",
		name: "Sweater",
		category: "Top",
		imageUrl: "/images/trouser.png",
	},
	{
		id: "13",
		name: "Face cap",
		category: "Accessory",
		imageUrl: "/images/shirt.png",
	},
	{
		id: "14",
		name: "Socks",
		category: "Accessory",
		imageUrl: "/images/singlet.png",
	},
	{
		id: "15",
		name: "Face towel",
		category: "Home",
		imageUrl: "/images/trouser.png",
	},
	{
		id: "16",
		name: "Joggers",
		category: "Bottom",
		imageUrl: "/images/singlet.png",
	},
	{
		id: "17",
		name: "Sweater",
		category: "Top",
		imageUrl: "/images/trouser.png",
	},
	{
		id: "18",
		name: "Face cap",
		category: "Accessory",
		imageUrl: "/images/shirt.png",
	},
	{
		id: "19",
		name: "Socks",
		category: "Accessory",
		imageUrl: "/images/singlet.png",
	},
	{
		id: "20",
		name: "Face towel",
		category: "Home",
		imageUrl: "/images/trouser.png",
	},
];
