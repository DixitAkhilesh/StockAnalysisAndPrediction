fetch('/p')
    .then(response => response.json())
    .then(data => {
        const prediction = data.prediciton;
        console.log(prediction);
        
});
