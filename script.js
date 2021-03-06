// jshint esversion: 6
// Hugo Moraes Dzin 8532186

var canvas = {
    width: 800,
    height: 450
};

var margin = {
    top: 15,
    bottom: 15,
    left: 80,
    right: 20,
};

margin.topBottom = margin.top + margin.bottom;
margin.leftRight = margin.left + margin.right;

svg = d3.select('#d3-container')
    .append('svg')
    .attr('width', canvas.width)
    .attr('height', canvas.height);


// Guardar as globais aqui
var g = {};

g.defaultCircleStyle = {
    fill: 'steelblue',
    opacity: 1,
    r: 2.5
};

// Makes a copy
g.circleStyle = Object.assign({}, g.defaultCircleStyle);
g.chosenCountry = 'ALL';
g.mouseSelection = '';

g.text_columns = ['Country', 'University_Name'];

g.colors = [
    ['Blue', 'steelblue'],
    ['Red', 'orangered',],
    ['Green', 'lime'],
    ['Yellow', 'gold'],
    ['Purple', 'Purple'],
    ['Brown', 'sienna'],
    ['Gray', 'lightgray']
];




g.circlesGroup = svg.append('g');

g.xAxis = d3.svg.axis()
    .orient('bottom')
    .outerTickSize(0);

g.yAxis = d3.svg.axis()
    .orient('left')
    .outerTickSize(0);

g.xAxisSvg = svg
    .append('g')
    .attr('class', 'axis');

g.yAxisSvg = svg
    .append('g')
    .attr('class', 'axis');



var loadCsv = d3.dsv(',', 'iso-8859-1');
loadCsv('TWUR 2016.csv', function(data) {
    g.data = preprocess(data);
    g.cols = Object.keys(g.data[0]);

    // Todo o trecho abaixo define o que cada botao da interface faz
    var $txtCanvasWidth = $('#txtCanvasWidth');
    var $txtCanvasHeight = $('#txtCanvasHeight');

    var $selAxis = $('.selAxis');
    var $selCountry = $('#selCountry');
    var $selColor = $('#selColor');

    var $rngOpacity = $('#rngOpacity');
    var $rngRadius = $('#rngRadius');

    var $message = $('#message');

    // List unique countries alphabetically
    g.countries = Array.from(new Set(
        data.map(row => row.Country))
    ).sort();


    // Fill select menus (x and y axes)
    g.cols.forEach(function(col) {
        if(g.text_columns.indexOf(col) === -1) {
            $selAxis.append($('<option>', {
                value: col,
                text: col
            }));
        }
    });

    // Fill select menus (country)
    g.countries.forEach(function(country) {
        $selCountry.append($('<option>', {
            value: country,
            text: country
        }));
    });

    // Fill color menus
    g.colors.forEach(function(color) {
        $selColor.append($('<option>', {
            value: color[1],
            text: color[0]
        }));
    });


    // O valor da variavel eh lido na funcao countryFilter
    $selCountry.change(function() {
        g.chosenCountry = $(this).val();
    });


    // Nos 3 blocos abaixo: ao mexer no input da interface,
    // atualiza o valor global correspondente e manda os pontos
    // atualizarem a aparencia tambem

    $rngOpacity.change(function() {
        var opacity= $(this).val();

        g.circleStyle.opacity = opacity;
        $('#txtOpacity').html(opacity);

        getChosenPoints()
            .style('opacity', opacity);
    });


    $rngRadius.change(function() {
        var r = $(this).val();

        g.circleStyle.r = r;
        $('#txtRadius').html(r);

        getChosenPoints()
            .style('r', r);
    });


    $selColor.change(function() {
        var fill = $(this).val();

        g.circleStyle.fill = fill;

        getChosenPoints()
            .style('fill', fill);
    });

    // Set default values
    $rngOpacity.val(g.defaultCircleStyle.opacity).change();
    $rngRadius.val(g.defaultCircleStyle.r).change();

    $txtCanvasWidth.val(canvas.width);
    $txtCanvasHeight.val(canvas.height);


    // Button that triggers axis change
    $('#btnOk').click(function() {
        var xcol = $('#selX').val();
        var ycol = $('#selY').val();

        canvas.width = +$txtCanvasWidth.val();
        canvas.height = +$txtCanvasHeight.val();

        if(isNaN(canvas.width + canvas.height)) {
            $message.html('Invalid dimensions.');
            return;
        }

        svg
            .attr('width', canvas.width)
            .attr('height', canvas.height);

        if(!xcol || !ycol) {
            $message.html('Select both X and Y axes.');
        } else {
            // Mostra o resto das opçoes, que estavam escondidas
            $('.hidden').removeClass('hidden');
            // Desenha o grafico
            updatePlot(g.data, xcol, ycol);
        }
    });

    $('#btnReset').click(function() {
        // Faz uma copia do objeto default
        g.circleStyle = Object.assign({}, g.defaultCircleStyle);

        getChosenPoints()
            .style(g.circleStyle);
    });

    $message.html('Please select X and Y axes.');
});


function preprocess(data) {
    // Converte campos numericos pra numeros (inicialmente,
    // todos os campos sao string), e corrige alguns campos
    // que foram digitados errado.
    $.each(data, function(index, row) {
        row.id = index;
        for(var key in row) {
            var value = row[key];

            if(key === 'World_Rank') {
                var i = value.indexOf('-');

                if(i === -1) {
                    // Just a number
                    row[key] = +value;
                } else {
                    // X-Y range -> take mean
                    var low = +value.slice(0, i);
                    var high = +value.slice(i + 1);

                    row[key] = (low + high) / 2;
                }
            } else if(g.text_columns.indexOf(key) === -1) {
                // Convert numeric columns
                if(value !== '') {
                    row[key] = +value;
                } else {
                    row[key] = NaN;
                }
            } else if(key === 'Country') {
                // Fix typos in dataset
                if(value == 'Unisted States of America') {
                    row[key] = 'United States of America';
                } else if(value == 'Unted Kingdom') {
                    row[key] = 'United Kingdom';
                }
            }
        }
    });

    return data;
}


// Chamada quando os eixos do grafico sao alterados
function updatePlot(data, xcol, ycol) {
    var xIsNumber = typeof data[0][xcol] === 'number';
    var yIsNumber = typeof data[0][ycol] === 'number';

    // Filter NaNs
    filtered_data = data.filter((row) => {
        var xnan = isNaN(row[xcol]) && xIsNumber;
        var ynan = isNaN(row[ycol]) && yIsNumber;

        return !xnan && !ynan;
    });

    // Display how many NaNs were filtered
    var dropped = data.length - filtered_data.length;
    $('#message').html('Ignored ' + dropped + ' missing values.');


    // Calculate domains based on selected columns
    var xDomain = getLinearDomain(filtered_data, xcol);

    var xScale = d3.scale.linear()
        .range([margin.left, canvas.width - margin.leftRight])
        .domain(xDomain);


    var yDomain = getLinearDomain(filtered_data, ycol);

    var yScale = d3.scale.linear()
        .range([canvas.height - margin.topBottom, margin.top])
        .domain(yDomain);


    g.xAxis.scale(xScale);
    g.yAxis.scale(yScale);

    var circles = g.circlesGroup
        .selectAll('circle')
        .data(filtered_data, (row) => row.id);

    circles.exit()
        .style('display', 'none');

    function updateAttr(selection) {
        selection
            .style('display', '')
            .attr('cx', (row, index) => xScale(row[xcol]))
            .attr('cy', (row, index) => yScale(row[ycol]));
    }

    updateAttr(circles.transition());
    updateAttr(circles.enter()
        .append('circle')
        .on('click', (d) => mouseHandler(d, 'click'))
        .on('mouseover', (d) => mouseHandler(d, 'mouseover'))
        .on('mouseout', (d) => mouseHandler(d, 'mouseout'))
        .style(g.circleStyle));

    updateAxes();
}


function updateAxes() {
    g.xAxisSvg.transition()
        .attr('transform', translate(0, canvas.height - margin.topBottom))
        .call(g.xAxis);
    g.yAxisSvg.transition()
        .attr('transform', translate(margin.left, 0))
        .call(g.yAxis);
}


// Calcula os valores maximo e minimo na coluna para saber qual
// deve ser o dominio. Tambem inclui um pouco de padding para o
// zero nao ficar na interseccao dos eixos
function getLinearDomain(data, col) {
    var min = data.reduce(function(answer, row) {
        if(row[col] < answer[col]) {
            return row;
        } else {
            return answer;
        }
    });

    var max = data.reduce(function(answer, row) {
        if(row[col] > answer[col]) {
            return row;
        } else {
            return answer;
        }
    });

    min = min[col];
    max = max[col];

    var interval = max - min;
    var padding = interval / 20;
    return [min - padding, max + padding];
}


function translate(w, h) {
    return 'translate(' + [w, h] + ')';
}


// Usado para alterar a aparencia dos pontos escolhidos
function getChosenPoints() {
    return g.circlesGroup
        .selectAll('circle')
        .filter(countryFilter)
        .transition();
}


// Chamado ao passar o mouse ou clicar num ponto
// Mouse em cima: mostra o nome da univerdiade na interface
// Mouse sai: mostra a universidade selecionada na interface
// Clicar: seleciona o ponto com o mouse
function mouseHandler(data, what) {
    var circle = $(d3.event.target);

    if(+circle.css('opacity') < 0.1) {
        // Invisible -> ignore
        return;
    }

    var univ = data.University_Name;
    var $sel = $('#txtMouseSelection');

    if(what === 'click') {
        g.mouseSelection = univ;
    } else if (what === 'mouseover') {
        $sel.html('Mouse Over: ' + univ);
    } else if (what === 'mouseout') {
        if(g.mouseSelection !== '') {
            $sel.html('Selected: ' + g.mouseSelection);
        } else {
            $sel.html('');
        }
    }
}


// Funcao que diz que o elemento "d" esta selecionado ou nao
// Leva em conta a inversao de selecao, o campo do dropdown de paises
// e a selecao do mouse
function countryFilter(d) {
    var shouldInvert = $('#chkInverted').prop('checked');
    var option = g.chosenCountry;
    var result;

    if(option === 'ALL') {
        result = true;
    } else if(option === 'MOUSE') {
        result = (d.University_Name === g.mouseSelection);
    } else {
        result = (d.Country === g.chosenCountry);
    }

    if(shouldInvert) {
        return !result;
    } else {
        return result;
    }

    // Mesmo de cima, so que menos legivel
    // return shouldInvert !== result;
}
