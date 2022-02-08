const csv = require('csv-parser');
const fs = require('fs');
const phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();

filePath = 'input.csv';

let jsonData = [];

//Ler arquivo csv
let stream = fs.createReadStream(filePath)
  .pipe(csv({
    //Separar o group em campos diferentes
    mapHeaders: ({ header, index }) => {
      if (header == "group") {
        return "group" + index;
      }
      return header;
    }
  }))
  .on('data', function (data) {
    //Processar cada linha
    stream.pause();
    addresses = [];
    emails = [];
    phones = [];
    groups = [];
    invisible = null;
    see_all = null;
    array = Object.entries(data);
    //Iterar todas as colunas de uma linha
    array.forEach(element => {
      let header = element[0];
      //Encontrar coluna email, processar e adicionar a addresses
      if (header.includes('email')) {
        if (data[header].length) {
          var separator;
          if (data[header].includes(',')) {
            separator = ',';
          } else if (data[header].includes('/')) {
            separator = '/';
          }
          // Separar email por vírgula ou barra
          let email = data[header].split(separator);
          email.forEach(item => {
            if (item.length) {
              // Tirar lixo do campo email
              emailAddress = item.split(' ')[0];
              if (emailAddress.match(
                /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
              )) {
                emailItem = [];
                emailItem.push(['type', 'email']);
                tags = header.split(' ');
                tags = tags.filter((tag) => tag != 'email');
                emailItem.push(['tags', tags]);
                emailItem.push(['address', emailAddress]);
                addresses.push((Object.fromEntries(emailItem)));
              }
            }
          });
        }
      }
      //Encontrar coluna phone, processar e adicionar a addresses
      if (header.includes('phone')) {
        if (data[header].length) {
          phones.push(['type', 'phone']);
          tags = header.split(' ');
          tags = tags.filter((tag) => tag != 'phone');
          phones.push(['tags', tags]);
          try {
            if (phoneUtil.isValidNumberForRegion(phoneUtil.parse(data[header], 'BR'), 'BR')) {
              const number = phoneUtil.parseAndKeepRawInput(data[header], 'BR');
              phoneAddress = number.getCountryCode().toString() + number.getNationalNumber();
              phones.push(['address', phoneAddress]);
              addresses.push((Object.fromEntries(phones)));
            }
          } catch (e) {
            console.error(e.message);
          }
        }
      }
      //Encontrar coluna group, processar e adicionar a groups
      if (header.includes('group')) {
        let separator;
        if (data[header].includes(',')) {
          separator = ',';
        } else if (data[header].includes('/')) {
          separator = '/';
        }
        let group = data[header].split(separator);
        group.forEach(element => {
          if (element.length) {
            groups.push(element.trim())
          }
        });
      }
      // Converter invisible e see_all para boolean
      switch (header) {
        case 'invisible':
          if (data[header] == 'yes' || data[header] == 1) {
            invisible = true;
          } else {
            invisible = false;
          }
          break;
        case 'see_all':
          if (data[header] == 'yes' || data[header] == 1) {
            see_all = true;
          } else {
            see_all = false;
          }
          break;
      }
    });
    // Verificar se o id já foi listado e concatenar os dados
    if (old = jsonData.find(element => element.eid == data.eid)) {
      old = Object.entries(old);
      old.forEach(element => {
        if (element[0] == "groups") {
          // Adicionar groups não repetidos
          groups.forEach(item => {
            if (!element[1].includes(item)) {
              element[1].push(item);
            }
          })
          element[1].sort();
        }
        // Adicionar addresses
        if (element[0] == "addresses") {
          element[1].push(...addresses);
        }
      });
    } else {
      //Removendo os campos de email, phone, group e invisible
      array = array.filter(element => !element.includes('email') && !element.includes('phone') && !element.includes('group') && !element.includes('invisible') && !element.includes('see_all'));
      //Adicionando os campos groups, addresses, invisible e see_all
      array.push(["groups", groups]);
      array.push(["addresses", addresses]);
      array.push(["invisible", invisible]);
      array.push(["see_all", see_all]);
      jsonData.push(Object.fromEntries(array));
    }
    stream.resume();
  })
  .on('end', function () {
    //Escrever arquivo de saída JSON
    jsonData = JSON.stringify(jsonData);
    fs.writeFile('output.json', jsonData, 'utf8', (err) => { console.log(err) });
  });