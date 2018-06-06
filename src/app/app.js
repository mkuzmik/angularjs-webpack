import angular from 'angular';

import '../style/app.css';

const MODULE_NAME = 'app';

const module = angular.module(MODULE_NAME, []);

module.component('home', {
  template: require('./home.html'),
  controller: function () {}
});

module.component('categories', {
  template: require('./categories.html'),
  controller: function ($http) {
    let that = this;

    $http.get('http://localhost:8080/forests').then(response => {
      that.categories = response.data;
    });

    that.show = (category) => {
      if (that.chosenCategory !== category)
        that.chosenCategory = category;
      else
        that.chosenCategory = undefined;
    };
  }
});

module.component('elements', {
  template: require('./elements.html'),
  bindings: {
    category: '<'
  },
  controller: function ($scope) {
    let that = this;

    that.$onChanges = function (changes) {
      that.elves = changes.category.currentValue.elves;
    };
  }
});

export default MODULE_NAME;
