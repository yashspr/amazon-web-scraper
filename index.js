const cheerio = require('cheerio');
const axios = require('axios');
const fs = require('fs');
const readline = require('readline');
const stringify = require('csv-stringify/lib/sync');

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

let base_url = "https://www.amazon.in/Vivo-Electric-Charge-Battery-Storage/product-reviews/B07DJD1RTM/";

axios.defaults.headers.common['User-Agent'] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:73.0) Gecko/20100101 Firefox/73.0";

function wait(ms) {
	return new Promise((resolve, reject) => {
		setTimeout(resolve, ms);
	});
}

function preprocess(html) {
	return html.replace(/<br>|<\/br>|<br\/>/g, "\n");
}

async function scrape(url) {

	let url_parts = url.split('/');
	let product_id = url_parts[4] == "dp" || url_parts[4] == "product" ? url_parts[5] : url_parts[4]
	let base_url = "https://www.amazon.in/product-reviews/" + product_id + "/?pageSize=20";
	let filename = product_id + ".csv";

	console.log("Base URL: " + base_url);

	let reviews = [];

	while (true) {
		let response = await axios.get(base_url);

		if (response.statusText != 'OK') {
			break;
		}

		let data = response.data;
		let $ = cheerio.load(data)

		let reviews_els = $('div[data-hook="review"]')
		reviews_els.each((i, el) => {
			let review_el = $(el);

			let review_text = review_el.find('span[data-hook="review-body"] > span').html();
			review_text = preprocess(review_text);
			review_text = cheerio.load(review_text).text();
			//console.log(review_text);

			let rating = review_el.find('i[data-hook="review-star-rating"] > span').text();
			rating = rating.split(" ")[0]
			//console.log(rating);

			reviews.push([
				review_text,
				parseInt(rating)
			]);
		});

		let next_page = $('ul.a-pagination > li.a-last > a').attr('href');

		// Writing to File
		let reviews_csv = stringify(reviews);
		fs.writeFileSync(filename, reviews_csv, { flag: 'a' });
		reviews = [];

		if (next_page == undefined || next_page == "") {
			break;
		} else {
			base_url = "https://www.amazon.in" + next_page;
		}
		console.log(next_page);

		await wait(parseInt(Math.random() * (1300 - 800) + 800));
	}

}

rl.question('Enter the URL of the product: ', (url) => {
	scrape(url);
	rl.close();
});