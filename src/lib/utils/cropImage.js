export const createImage = (url) =>
	new Promise((resolve, reject) => {
		const image = new Image();
		image.addEventListener('load', () => resolve(image));
		image.addEventListener('error', (error) => reject(error));
		image.setAttribute('crossOrigin', 'anonymous');
		image.src = url;
	});

export default async function getCroppedImg(imageSrc, pixelCrop) {
	const image = await createImage(imageSrc);
	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d');

	if (!ctx) {
		throw new Error('No 2d context');
	}

	// Set canvas dimensions to the cropped size.
	canvas.width = pixelCrop.width;
	canvas.height = pixelCrop.height;

	// Use the context to draw the cropped image
	ctx.drawImage(
		image,
		pixelCrop.x,
		pixelCrop.y,
		pixelCrop.width,
		pixelCrop.height,
		0,
		0,
		pixelCrop.width,
		pixelCrop.height
	);

	return new Promise((resolve, reject) => {
		canvas.toBlob((file) => {
			if (!file) {
				console.error('Canvas is empty');
				reject(new Error('Canvas is empty'));
				return;
			}
			file.name = 'cropped.jpeg';
			resolve(file);
		}, 'image/jpeg');
	});
}
