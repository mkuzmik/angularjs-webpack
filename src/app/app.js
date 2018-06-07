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

    that.toAdd = {};

    that.refetch = () => $http.get('/forests').then(response => {
      that.categories = response.data;
      that.categories.sort((a, b) => a.id - b.id);
    });

    that.refetch();

    that.show = (category) => {
      if (that.chosenCategory !== category)
        that.chosenCategory = category;
      else
        that.chosenCategory = undefined;
    };

    that.add = () => {
      $http.post('/forests', that.toAdd).then(() => {
        that.toAdd = {};
        that.refetch();
      });
    };

    that.editMode = (forest) => {
      forest.toEdit = angular.copy(forest);
      forest.editMode = true;
      forest.toEdit.id = undefined;
      forest.toEdit.editMode = undefined;
      forest.toEdit.elves = undefined;
    };

    that.edit = (forest) => {
      $http.put('/forests/' + forest.id, forest.toEdit).then(() => {
        forest.editMode = false;
        that.refetch();
      });
    };

    that.delete = (forest) => {
      $http.delete('/forests/' + forest.id).then(() => {
        that.refetch();
      });
    };
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
      $http.get('/elves').then(response => {
        that.elves = response.data.filter(elf => elf.forestId === that.category.id);
        that.elves.sort((a, b) => a.id - b.id);
        that.toAdd = { forestId: that.category.id };
      });
    };

    that.editMode = (elf) => {
      elf.toEdit = angular.copy(elf);
      elf.editMode = true;
      elf.toEdit.id = undefined;
      elf.toEdit.editMode = undefined;
    };

    that.edit = (elf) => {
      $http.put('/elves/' + elf.id, elf.toEdit).then(() => {
        elf.editMode = false;
        // TODO refetch only one efl, use NamedQuery on backend
        that.refetch();
      });
    };

    that.add = () => {
      $http.post('/elves', that.toAdd).then(() => {
        that.refetch();
      });
    };

    that.delete = (elf) => {
      $http.delete('/elves/' + elf.id).then(() => {
        that.refetch();
      });
    };
  }
});

export default MODULE_NAME;
