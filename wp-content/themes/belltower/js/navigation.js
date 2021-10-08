/**
 * File navigation.js.
 *
 * Handles toggling the navigation menu for small screens and enables TAB key
 * navigation support for dropdown menus.
 */

 const doc = document;
 const docbody = doc.body;
 const btpage = doc.getElementById('primary');

( function() {
	var container, button, menu, links, i, len;

	container = document.getElementById( 'site-navigation' );
	if ( ! container ) {
		return;
	}

	button = container.getElementsByTagName( 'button' )[0];
	if ( 'undefined' === typeof button ) {
		return;
	}

	menu = container.getElementsByTagName( 'ul' )[0];

	// Hide menu toggle button if menu is empty and return early.
	if ( 'undefined' === typeof menu ) {
		button.style.display = 'none';
		return;
	}

	if ( -1 === menu.className.indexOf( 'nav-menu' ) ) {
		menu.className += ' nav-menu';
	}

	button.onclick = function() {
		if ( -1 !== container.className.indexOf( 'toggled' ) ) {
			container.className = container.className.replace( ' toggled', '' );
			button.setAttribute( 'aria-expanded', 'false' );
			docbody.classList.remove('menu-toggled');
		} else {
			container.className += ' toggled';
			button.setAttribute( 'aria-expanded', 'true' );
			docbody.classList.add('menu-toggled');
		}
	};

	// Close small menu when user clicks outside
	document.addEventListener( 'click', function( event ) {
		var isClickInside = container.contains( event.target );

		if ( ! isClickInside ) {
			container.className = container.className.replace( ' toggled', '' );
			docbody.classList.remove('menu-toggled');
			button.setAttribute( 'aria-expanded', 'false' );
		}
	} );

	// Get all the link elements within the menu.
	links = menu.getElementsByTagName( 'a' );

	// Each time a menu link is focused or blurred, toggle focus.
	for ( i = 0, len = links.length; i < len; i++ ) {
		links[i].addEventListener( 'focus', toggleFocus, true );
		links[i].addEventListener( 'blur', toggleFocus, true );
	}

	/**
	 * Sets or removes .focus class on an element.
	 */
	function toggleFocus() {
		var self = this;

		// Move up through the ancestors of the current link until we hit .nav-menu.
		while ( -1 === self.className.indexOf( 'nav-menu' ) ) {
			// On li elements toggle the class .focus.
			if ( 'li' === self.tagName.toLowerCase() ) {
				if ( -1 !== self.className.indexOf( 'focus' ) ) {
					self.className = self.className.replace( ' focus', '' );
				} else {
					self.className += ' focus';
				}
			}

			self = self.parentElement;
		}
	}

	/**
	 * Toggles `focus` class to allow submenu access on tablets.
	 */
	( function() {
		var touchStartFn,
			parentLink = container.querySelectorAll( '.menu-item-has-children > a, .page_item_has_children > a' );

		if ( 'ontouchstart' in window ) {
			touchStartFn = function( e ) {
				var menuItem = this.parentNode;

				if ( ! menuItem.classList.contains( 'focus' ) ) {
					e.preventDefault();
					for ( i = 0; i < menuItem.parentNode.children.length; ++i ) {
						if ( menuItem === menuItem.parentNode.children[i] ) {
							continue;
						}
						menuItem.parentNode.children[i].classList.remove( 'focus' );
					}
					menuItem.classList.add( 'focus' );
				} else {
					menuItem.classList.remove( 'focus' );
				}
			};

			for ( i = 0; i < parentLink.length; ++i ) {
				parentLink[i].addEventListener( 'touchstart', touchStartFn, false );
			}
		}
	}( container ) );
}() );

//////
//Begin Custom



//Give the page top padding based on height on Nav
const ro = new ResizeObserver(entries => {
	for (let entry of entries) {

		if (docbody.classList.contains('home')) {
			doc.getElementById('home-head').style.paddingTop=entry.contentRect.height + 'px';
		}
		else {
			btpage.style.paddingTop=entry.contentRect.height + 'px';
		}

		
	}
});
ro.observe(doc.querySelector('#masthead'));

//Detect Scroll to adjust Nav
let observer = new IntersectionObserver(entries => {
	if (entries[0].boundingClientRect.y < 0) {
		docbody.classList.add('scrolled');
	} else {
		docbody.classList.remove('scrolled');
	}
});
observer.observe(document.querySelector("#pixel-to-watch"));

//Inset Home Nav Icon
var btlogo = '<svg id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2000 649.2"><defs></defs><path class="cls-1" d="M1650,29.35l-65.28,191.74-25.13-81.42,38.51-110.32h-31.33l-22.52,66.91-22.52-66.91h-31l38.52,110.32-25.46,81.42L1438.49,29.35h-32.64l79.64,216.07c3.91,10.77,12.07,14.36,18.28,14.36s14.36-3.59,18.28-14.36l22.19-63,22.52,63c4.89,10.77,12.07,14.36,18,14.36a19.5,19.5,0,0,0,18.6-14.36l79.32-216.07Z"/><path class="cls-1" d="M826.88,383.76c0-41.78-29.37-64.3-65.6-64.3h-61V547.92H730.6V448.05h11.75L792,547.92h34.59L774.66,447.07C803.38,441.53,826.88,419,826.88,383.76Zm-65.6,35.9H730.6v-71.8h30.68c24.48,0,35.57,16,35.57,35.9S785.76,419.66,761.28,419.66Z"/><path class="cls-1" d="M633.56,418c12.08-6.2,23.17-20.89,23.17-40.8,0-33.94-22.84-57.77-60.7-57.77H526.84V547.92H599c40.8,0,71.8-28.72,71.8-70.5C670.77,446.74,652.49,426.18,633.56,418ZM557.2,347.86h39.48c18.93,0,30,11.74,30,29.37,0,17.3-11.1,29-30,29H557.2Zm39.48,171.66H557.2V434.67h39.48c29.05,0,43.74,18.6,43.74,42.43S625.73,519.52,596.68,519.52Z"/><polygon class="cls-1" points="1313.91 347.86 1349.16 347.86 1349.16 519.52 1313.91 519.52 1313.91 547.92 1415.09 547.92 1415.09 519.52 1379.51 519.52 1379.51 347.86 1415.09 347.86 1415.09 319.46 1313.91 319.46 1313.91 347.86"/><polygon class="cls-1" points="1565.54 488.19 1484.28 319.46 1450.66 319.46 1450.66 547.92 1481.01 547.92 1481.01 379.19 1562.6 547.92 1595.89 547.92 1595.89 319.46 1565.54 319.46 1565.54 488.19"/><path class="cls-1" d="M1196.46,511l-25.13-81.42,38.51-110.32h-31.33L1156,386.21l-22.52-66.91h-31L1141,429.62,1115.51,511,1050.23,319.3h-32.64l79.64,216.07c3.92,10.77,12.08,14.36,18.28,14.36s14.37-3.59,18.28-14.36l22.19-63,22.53,63c4.89,10.77,12.07,14.36,18,14.36a19.51,19.51,0,0,0,18.6-14.36l79.32-216.07h-32.65Z"/><polygon class="cls-1" points="892.15 446.74 959.38 446.74 959.38 418.35 892.15 418.35 892.15 347.86 998.22 347.86 998.22 319.46 861.8 319.46 861.8 547.92 1000.18 547.92 1000.18 519.52 892.15 519.52 892.15 446.74"/><polygon class="cls-1" points="1038.17 231.03 905.86 231.03 905.86 30.97 875.5 30.97 875.5 259.42 1038.17 259.42 1038.17 231.03"/><path class="cls-1" d="M633.56,129.53c12.08-6.2,23.17-20.89,23.17-40.8C656.73,54.79,633.89,31,596,31H526.84V259.42H599c40.8,0,71.8-28.71,71.8-70.49C670.77,158.25,652.49,137.69,633.56,129.53ZM557.2,59.36h39.48c18.93,0,30,11.75,30,29.37,0,17.3-11.1,29.05-30,29.05H557.2ZM596.68,231H557.2V146.17h39.48c29.05,0,43.74,18.61,43.74,42.43S625.73,231,596.68,231Z"/><polygon class="cls-1" points="734.08 158.25 801.31 158.25 801.31 129.85 734.08 129.85 734.08 59.36 840.15 59.36 840.15 30.97 703.73 30.97 703.73 259.42 842.11 259.42 842.11 231.03 734.08 231.03 734.08 158.25"/><polygon class="cls-1" points="1045.69 155.99 988.35 155.99 988.35 30.97 957.99 30.97 957.99 184.39 1045.69 184.39 1045.69 155.99"/><path class="cls-1" d="M1945.66,442.3c-31,0-54.34,22.93-54.34,54.34S1914.67,551,1945.66,551,2000,528.06,2000,496.64,1976.65,442.3,1945.66,442.3Zm0,84.91c-18.47,0-31.84-12.31-31.84-30.57s13.37-30.56,31.84-30.56,31.84,12.31,31.84,30.56S1964.13,527.21,1945.66,527.21Z"/><path class="cls-1" d="M1983.87,414.28c10-9.76,16.13-22.28,16.13-38.84,0-31.21-23.14-54.35-54.34-54.35s-54.34,23.14-54.34,54.35c0,30.78,23.35,54.13,54.34,54.13V406.22c-19.1,0-32.27-12.74-32.27-30.78,0-18.26,13.17-30.57,32.27-30.57s32.26,12.31,32.26,30.57a28.41,28.41,0,0,1-9.55,21.65Z"/><path class="cls-1" d="M1736.76,449.68h78c-6.85,40.14-32.63,73.11-78.32,73.11-49.94,0-81.92-41.78-81.92-87.47,0-46.67,31.66-87.47,81.92-87.47,29,0,50.26,13.06,64.62,32.64l21.21-20.89c-20.56-24.48-49.93-40.47-85.83-40.47-64.62,0-112.92,51.89-112.92,116.19s48.3,116.18,112.92,116.18c36.55,0,63-18,79-41.77v39.82h28.71V421.28H1736.76Z"/><polygon class="cls-1" points="1098.25 257.9 1128.6 257.9 1128.6 57.84 1180.82 57.84 1180.82 29.45 1046.04 29.45 1046.04 57.84 1098.25 57.84 1098.25 257.9"/><polygon class="cls-1" points="1738.9 156.73 1806.14 156.73 1806.14 128.33 1738.9 128.33 1738.9 57.84 1844.97 57.84 1844.97 29.45 1708.56 29.45 1708.56 257.9 1846.93 257.9 1846.93 229.51 1738.9 229.51 1738.9 156.73"/><path class="cls-1" d="M1903.72,158h11.75l49.61,99.87h34.59l-51.89-100.84C1976.5,151.51,2000,129,2000,93.74c0-41.78-29.37-64.29-65.6-64.29h-61V257.9h30.35Zm0-100.19h30.68c24.48,0,35.57,16,35.57,35.9s-11.09,35.9-35.57,35.9h-30.68Z"/><path class="cls-1" d="M1409.28,143.67c0-64.29-48.3-116.18-112.92-116.18s-112.92,51.89-112.92,116.18,48.3,116.19,112.92,116.19S1409.28,208,1409.28,143.67Zm-112.92,87.47c-50.26,0-81.92-41.77-81.92-87.47s31.66-87.46,81.92-87.46c50.59,0,81.92,41.77,81.92,87.46S1347,231.14,1296.36,231.14Z"/><path class="cls-1" d="M218.16,0C97.87,0,0,97.87,0,218.15V548.22H30.59V218.15c0-103.42,84.14-187.56,187.57-187.56s187.56,84.14,187.56,187.56V548.22h30.6V218.15C436.32,97.87,338.45,0,218.16,0Z"/><path class="cls-1" d="M218.15,67.64c-83,0-150.53,67.53-150.53,150.52V548.22H98.21V218.16a119.94,119.94,0,0,1,239.88,0V548.22h30.59V218.16C368.68,135.17,301.16,67.64,218.15,67.64Z"/><path class="cls-1" d="M218.15,135.28a83,83,0,0,0-82.9,82.88V548.22h30.6V218.16a52.31,52.31,0,0,1,104.61,0V548.22h30.59V218.16A83,83,0,0,0,218.15,135.28Z"/><path class="cls-1" d="M233.45,559.52V222.85a15.3,15.3,0,1,0-30.59,0V559.52a46.17,46.17,0,1,0,30.59,0Zm-15.3,60.69A17.19,17.19,0,1,1,235.35,603,17.21,17.21,0,0,1,218.15,620.21Z"/></svg>';
var src = document.getElementsByClassName('home menu-item');
var homeAnchor = src[0].children[0];
//console.log('src[0].children',src[0].children)
//homeAnchor.innerHTML = btlogo;
homeAnchor.innerHTML = btlogo + '<span>Home</span>';

//Insert logo for mobile
var shw1 = document.getElementsByClassName('site-header-w1');
shw1[0].insertAdjacentHTML('beforeend', '<a href="/" class="mlogo">'+btlogo+'</a>');
