# About

## In short

You go to a grocery store, scan the barcode and see if you have a review for this product already - and if not, you can leave a new review.

![Demo](./assets/scan_showcase.gif)

## A bit more context

I frequently had a problem at grocery stores when looking at products where I couldn't remember if I've tried them before and if I did how much I've liked them - so to solve that problem I made this app. 
With it you can find a product page by scanning its barcode with a camera, then leave a review or find an existing one, mark the review as private, add tags to reviews, search through your own reviews or search through other public reviews.

# Useful info for development

## Camera access

For local development - most browsers don't allow access to camera through `navigator.mediaDevices.getUserMedia()` in unsecure context.
You can bypass this through either testing on `localhost` or setting your dev server ip address as secure in unsafe chrome flags.

## Services used

- [Turso](https://turso.tech) - Database, SQLite
- [Uploadthing](https://uploadthing.com/) - File uploads
- [Upstash](https://upstash.com/) - Redis, Message Queue
- [Vercel](https://vercel.com/) - Deployment

This project initially was created using a [T3 Stack](https://create.t3.gg/) template.
