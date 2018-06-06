import angular from 'angular';


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

    that.toAdd = {}

    that.refetch = () => $http.get('http://localhost:8080/forests').then(response => {
      that.categories = response.data;
    });

    that.refetch();

    that.show = (category) => {
      if (that.chosenCategory !== category)
        that.chosenCategory = category;
      else
        that.chosenCategory = undefined;
    };

    that.add = () => {
      $http.post('http://localhost:8080/forests', that.toAdd).then(() => {
        that.toAdd = {};
        that.refetch();
      });
    }
  }
});

module.component('elements', {
  template: require('./elements.html'),
  bindings: {
    category: '<'
  },
  controller: function ($http) {
    let that = this;

    that.bowTypes = ['SMALL', 'BIG'];
    that.powerTypes = ['SPEED', 'STRENGHT'];

    that.$onChanges = function (changes) {
      that.refetch();
    };

    that.refetch = () => {
      $http.get('http://localhost:8080/elves').then(response => {
        that.elves = response.data.filter(elf => elf.forestId === that.category.id);
        that.toAdd = { forestId: that.category.id };
      });
    };

    that.add = () => {
      $http.post('http://localhost:8080/elves', that.toAdd).then(() => {
        that.refetch();
      });
    }
  }
});

export default MODULE_NAME;
